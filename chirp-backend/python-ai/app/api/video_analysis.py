import logging
import cv2
import numpy as np
import tempfile
import os
import aiofiles
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from pydantic import BaseModel, HttpUrl
import httpx

from app.services.model_manager import ModelManager

logger = logging.getLogger(__name__)

router = APIRouter()

class VideoAnalysisRequest(BaseModel):
    video_url: HttpUrl

class VideoAnalysisResponse(BaseModel):
    face_landmarks: Dict[str, Any]
    eye_contact_score: float
    smile_prob: float
    expression: Dict[str, float]
    gaze: Dict[str, float]
    timestamps: List[Dict[str, Any]]

async def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state."""
    from app.main import model_manager
    if model_manager is None:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    return model_manager

@router.post("/video", response_model=VideoAnalysisResponse)
async def analyze_video_from_url(
    request: VideoAnalysisRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Analyze video from URL."""
    try:
        # Download video from URL
        video_path = await download_video(str(request.video_url))
        
        try:
            # Analyze video
            result = await analyze_video_file(video_path, model_manager)
            return result
        finally:
            # Cleanup downloaded file
            if os.path.exists(video_path):
                os.remove(video_path)
                
    except Exception as e:
        logger.error(f"Video analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")

@router.post("/video/upload", response_model=VideoAnalysisResponse)
async def analyze_video_upload(
    file: UploadFile = File(...),
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Analyze uploaded video file."""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="File must be a video")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            content = await file.read()
            temp_file.write(content)
            video_path = temp_file.name
        
        try:
            # Analyze video
            result = await analyze_video_file(video_path, model_manager)
            return result
        finally:
            # Cleanup temp file
            if os.path.exists(video_path):
                os.remove(video_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video upload analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")

async def download_video(url: str) -> str:
    """Download video from URL to temporary file."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                temp_file.write(response.content)
                return temp_file.name
                
    except Exception as e:
        logger.error(f"Video download error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download video: {str(e)}")

async def analyze_video_file(video_path: str, model_manager: ModelManager) -> VideoAnalysisResponse:
    """Analyze video file and extract facial features."""
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError("Could not open video file")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        # Initialize MediaPipe
        face_mesh = model_manager.get_face_mesh()
        face_detection = model_manager.get_face_detection()
        
        # Analysis results
        all_landmarks = []
        eye_contact_scores = []
        smile_probabilities = []
        expressions = []
        gaze_directions = []
        timestamps = []
        
        frame_count = 0
        sample_rate = max(1, int(fps / 5))  # Sample 5 frames per second
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Skip frames to reduce processing time
            if frame_count % sample_rate != 0:
                continue
            
            timestamp = frame_count / fps if fps > 0 else frame_count
            
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detect face
            face_results = face_detection.process(rgb_frame)
            
            if face_results.detections:
                # Get face landmarks
                mesh_results = face_mesh.process(rgb_frame)
                
                if mesh_results.multi_face_landmarks:
                    landmarks = mesh_results.multi_face_landmarks[0]
                    
                    # Convert landmarks to numpy array
                    landmark_array = np.array([
                        [lm.x, lm.y, lm.z] for lm in landmarks.landmark
                    ])
                    
                    all_landmarks.append(landmark_array)
                    
                    # Calculate metrics
                    eye_contact_score = calculate_eye_contact_score(landmark_array)
                    smile_prob = calculate_smile_probability(landmark_array)
                    gaze_direction = calculate_gaze_direction(landmark_array)
                    expression = model_manager.classify_emotion(landmark_array)
                    
                    eye_contact_scores.append(eye_contact_score)
                    smile_probabilities.append(smile_prob)
                    expressions.append(expression)
                    gaze_directions.append(gaze_direction)
                    
                    # Add significant events to timestamps
                    if smile_prob > 0.6:
                        timestamps.append({
                            "start": timestamp,
                            "end": timestamp + (1/fps) * sample_rate,
                            "tag": "smile"
                        })
                    
                    if eye_contact_score > 0.7:
                        timestamps.append({
                            "start": timestamp,
                            "end": timestamp + (1/fps) * sample_rate,
                            "tag": "eye_contact"
                        })
        
        cap.release()
        
        # Aggregate results
        if not all_landmarks:
            # No face detected
            return VideoAnalysisResponse(
                face_landmarks={},
                eye_contact_score=0.0,
                smile_prob=0.0,
                expression={"neutral": 1.0},
                gaze={"center": 1.0, "left": 0.0, "right": 0.0},
                timestamps=[]
            )
        
        # Calculate averages
        avg_eye_contact = np.mean(eye_contact_scores) if eye_contact_scores else 0.0
        avg_smile_prob = np.mean(smile_probabilities) if smile_probabilities else 0.0
        
        # Aggregate expressions
        aggregated_expression = aggregate_expressions(expressions)
        
        # Aggregate gaze directions
        aggregated_gaze = aggregate_gaze_directions(gaze_directions)
        
        # Create face landmarks summary
        face_landmarks_summary = {
            "total_frames_analyzed": len(all_landmarks),
            "avg_landmark_confidence": 0.8,  # Placeholder
            "face_detected_ratio": len(all_landmarks) / max(1, frame_count // sample_rate)
        }
        
        return VideoAnalysisResponse(
            face_landmarks=face_landmarks_summary,
            eye_contact_score=float(avg_eye_contact),
            smile_prob=float(avg_smile_prob),
            expression=aggregated_expression,
            gaze=aggregated_gaze,
            timestamps=timestamps
        )
        
    except Exception as e:
        logger.error(f"Video analysis processing error: {e}")
        raise

def calculate_eye_contact_score(landmarks: np.ndarray) -> float:
    """Calculate eye contact score based on gaze direction."""
    try:
        # Get eye landmarks
        left_eye_center = landmarks[468]  # Approximate center
        right_eye_center = landmarks[473]  # Approximate center
        nose_tip = landmarks[1]
        
        # Calculate gaze vector (simplified)
        eye_center = (left_eye_center + right_eye_center) / 2
        
        # Check if eyes are looking forward (toward camera)
        # This is a simplified calculation - in practice, you'd use more sophisticated gaze estimation
        gaze_vector = eye_center - nose_tip
        
        # Eye contact score based on gaze direction
        # Higher score when looking more directly at camera
        forward_score = 1.0 - min(1.0, np.linalg.norm(gaze_vector[:2]) * 10)
        
        return max(0.0, forward_score)
        
    except Exception:
        return 0.5  # Default neutral score

def calculate_smile_probability(landmarks: np.ndarray) -> float:
    """Calculate smile probability from mouth landmarks."""
    try:
        # Get mouth landmarks
        mouth_left = landmarks[61]
        mouth_right = landmarks[291] 
        mouth_top = landmarks[13]
        mouth_bottom = landmarks[14]
        
        # Calculate mouth dimensions
        mouth_width = np.linalg.norm(mouth_right - mouth_left)
        mouth_height = np.linalg.norm(mouth_bottom - mouth_top)
        
        # Smile detection based on width/height ratio and corner elevation
        if mouth_height > 0:
            width_height_ratio = mouth_width / mouth_height
            
            # Get mouth corners
            left_corner = landmarks[61]
            right_corner = landmarks[291]
            mouth_center = (mouth_top + mouth_bottom) / 2
            
            # Check if corners are elevated relative to center
            corner_elevation = ((left_corner[1] + right_corner[1]) / 2) - mouth_center[1]
            
            # Combine metrics for smile probability
            smile_score = min(1.0, max(0.0, 
                (width_height_ratio - 2.5) / 2.0 + corner_elevation * 5
            ))
            
            return smile_score
        
        return 0.0
        
    except Exception:
        return 0.0

def calculate_gaze_direction(landmarks: np.ndarray) -> Dict[str, float]:
    """Calculate gaze direction probabilities."""
    try:
        # Get eye landmarks
        left_eye_inner = landmarks[133]
        left_eye_outer = landmarks[33]
        right_eye_inner = landmarks[362]
        right_eye_outer = landmarks[263]
        
        # Calculate eye centers
        left_eye_center = (left_eye_inner + left_eye_outer) / 2
        right_eye_center = (right_eye_inner + right_eye_outer) / 2
        
        # Get iris positions (simplified - would need pupil detection in practice)
        # For now, estimate based on eye shape
        
        # Calculate horizontal gaze direction
        eye_width_left = np.linalg.norm(left_eye_outer - left_eye_inner)
        eye_width_right = np.linalg.norm(right_eye_outer - right_eye_inner)
        
        # Simplified gaze estimation
        # In practice, you'd track pupil position relative to eye corners
        center_prob = 0.6  # Default assumption
        left_prob = 0.2
        right_prob = 0.2
        
        return {
            "left": left_prob,
            "center": center_prob,
            "right": right_prob
        }
        
    except Exception:
        return {"left": 0.33, "center": 0.34, "right": 0.33}

def aggregate_expressions(expressions: List[Dict[str, float]]) -> Dict[str, float]:
    """Aggregate emotion expressions over time."""
    if not expressions:
        return {"neutral": 1.0}
    
    # Average each emotion
    emotion_sums = {}
    for expr in expressions:
        for emotion, prob in expr.items():
            emotion_sums[emotion] = emotion_sums.get(emotion, 0) + prob
    
    # Calculate averages
    num_expressions = len(expressions)
    aggregated = {
        emotion: total / num_expressions 
        for emotion, total in emotion_sums.items()
    }
    
    # Normalize to ensure probabilities sum to 1
    total_prob = sum(aggregated.values())
    if total_prob > 0:
        aggregated = {k: v / total_prob for k, v in aggregated.items()}
    
    return aggregated

def aggregate_gaze_directions(gaze_directions: List[Dict[str, float]]) -> Dict[str, float]:
    """Aggregate gaze directions over time."""
    if not gaze_directions:
        return {"left": 0.33, "center": 0.34, "right": 0.33}
    
    # Average each direction
    direction_sums = {"left": 0.0, "center": 0.0, "right": 0.0}
    for gaze in gaze_directions:
        for direction, prob in gaze.items():
            direction_sums[direction] += prob
    
    # Calculate averages
    num_gazes = len(gaze_directions)
    aggregated = {
        direction: total / num_gazes 
        for direction, total in direction_sums.items()
    }
    
    return aggregated