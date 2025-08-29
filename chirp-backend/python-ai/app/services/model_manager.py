import logging
import torch
import whisper
import mediapipe as mp
import numpy as np
from typing import Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import os

logger = logging.getLogger(__name__)

class ModelManager:
    """Manages AI models and their lifecycle."""
    
    def __init__(self):
        self.models = {}
        self.executor = ThreadPoolExecutor(max_workers=2)  # For CPU-bound tasks
        self.device = self._get_device()
        
        # MediaPipe components
        self.mp_face_mesh = None
        self.mp_face_detection = None
        self.mp_drawing = None
        self.mp_drawing_styles = None
        
        # Whisper model
        self.whisper_model = None
        
        # Emotion classifier (placeholder - would be a trained model)
        self.emotion_classifier = None
        
        logger.info(f"ModelManager initialized with device: {self.device}")
    
    def _get_device(self) -> str:
        """Determine the best device to use for inference."""
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"  # Apple Silicon
        else:
            return "cpu"
    
    async def initialize(self):
        """Initialize all AI models."""
        logger.info("Initializing AI models...")
        
        try:
            # Initialize MediaPipe
            await self._init_mediapipe()
            
            # Initialize Whisper
            await self._init_whisper()
            
            # Initialize emotion classifier
            await self._init_emotion_classifier()
            
            logger.info("All AI models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize models: {e}")
            raise
    
    async def _init_mediapipe(self):
        """Initialize MediaPipe components."""
        try:
            self.mp_face_mesh = mp.solutions.face_mesh
            self.mp_face_detection = mp.solutions.face_detection
            self.mp_drawing = mp.solutions.drawing_utils
            self.mp_drawing_styles = mp.solutions.drawing_styles
            
            logger.info("MediaPipe initialized")
        except Exception as e:
            logger.error(f"Failed to initialize MediaPipe: {e}")
            raise
    
    async def _init_whisper(self):
        """Initialize Whisper STT model."""
        try:
            # Load Whisper model in thread pool to avoid blocking
            model_size = os.getenv("WHISPER_MODEL_SIZE", "base")  # tiny, base, small, medium, large
            
            def load_whisper():
                return whisper.load_model(model_size, device=self.device)
            
            self.whisper_model = await asyncio.get_event_loop().run_in_executor(
                self.executor, load_whisper
            )
            
            logger.info(f"Whisper model ({model_size}) initialized on {self.device}")
        except Exception as e:
            logger.error(f"Failed to initialize Whisper: {e}")
            raise
    
    async def _init_emotion_classifier(self):
        """Initialize emotion classifier."""
        try:
            # This is a placeholder for a trained emotion classifier
            # In production, you would load a pre-trained model here
            # For now, we'll use a simple rule-based classifier
            
            self.emotion_classifier = SimpleEmotionClassifier()
            logger.info("Emotion classifier initialized (simple rule-based)")
            
        except Exception as e:
            logger.error(f"Failed to initialize emotion classifier: {e}")
            raise
    
    async def health_check(self) -> Dict[str, bool]:
        """Check health of all models."""
        health = {
            "mediapipe": self.mp_face_mesh is not None,
            "whisper": self.whisper_model is not None,
            "emotion_classifier": self.emotion_classifier is not None,
        }
        return health
    
    def get_face_mesh(self):
        """Get MediaPipe face mesh."""
        return self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
    
    def get_face_detection(self):
        """Get MediaPipe face detection."""
        return self.mp_face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=0.5
        )
    
    async def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio using Whisper."""
        if not self.whisper_model:
            raise RuntimeError("Whisper model not initialized")
        
        def transcribe():
            result = self.whisper_model.transcribe(
                audio_path,
                word_timestamps=True,
                language="en"  # Can be made configurable
            )
            return result
        
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, transcribe
        )
    
    def classify_emotion(self, face_landmarks: np.ndarray) -> Dict[str, float]:
        """Classify emotion from face landmarks."""
        if not self.emotion_classifier:
            raise RuntimeError("Emotion classifier not initialized")
        
        return self.emotion_classifier.predict(face_landmarks)
    
    async def cleanup(self):
        """Cleanup resources."""
        logger.info("Cleaning up model resources...")
        
        # Clear models
        self.whisper_model = None
        self.emotion_classifier = None
        
        # Shutdown thread pool
        self.executor.shutdown(wait=True)
        
        # Clear CUDA cache if using GPU
        if self.device == "cuda":
            torch.cuda.empty_cache()
        
        logger.info("Model cleanup complete")


class SimpleEmotionClassifier:
    """Simple rule-based emotion classifier using face landmarks."""
    
    def __init__(self):
        # Define key landmark indices for emotion detection
        self.mouth_landmarks = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308]
        self.eye_landmarks = {
            "left": [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
            "right": [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        }
        self.eyebrow_landmarks = {
            "left": [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
            "right": [296, 334, 293, 300, 276, 283, 282, 295, 285, 336]
        }
    
    def predict(self, landmarks: np.ndarray) -> Dict[str, float]:
        """Predict emotion probabilities from landmarks."""
        try:
            # Calculate basic features
            smile_score = self._calculate_smile_score(landmarks)
            eye_openness = self._calculate_eye_openness(landmarks)
            eyebrow_height = self._calculate_eyebrow_height(landmarks)
            
            # Simple rule-based classification
            emotions = {
                "happy": max(0.0, smile_score),
                "neutral": 0.5 if smile_score < 0.3 and eye_openness > 0.3 else 0.2,
                "confused": max(0.0, 0.5 - smile_score - eye_openness),
                "frustrated": max(0.0, eyebrow_height - 0.5) if smile_score < 0.3 else 0.1,
                "excited": min(1.0, smile_score * eye_openness * 2) if smile_score > 0.4 else 0.1
            }
            
            # Normalize probabilities
            total = sum(emotions.values())
            if total > 0:
                emotions = {k: v / total for k, v in emotions.items()}
            
            return emotions
            
        except Exception as e:
            logger.error(f"Error in emotion classification: {e}")
            # Return default neutral emotion
            return {
                "happy": 0.2,
                "neutral": 0.6,
                "confused": 0.1,
                "frustrated": 0.05,
                "excited": 0.05
            }
    
    def _calculate_smile_score(self, landmarks: np.ndarray) -> float:
        """Calculate smile score based on mouth landmarks."""
        try:
            if len(landmarks) < max(self.mouth_landmarks):
                return 0.0
            
            # Get mouth corner points
            left_corner = landmarks[61]  # Left mouth corner
            right_corner = landmarks[291]  # Right mouth corner
            top_lip = landmarks[13]  # Top lip center
            bottom_lip = landmarks[14]  # Bottom lip center
            
            # Calculate mouth width and height
            mouth_width = np.linalg.norm(right_corner - left_corner)
            mouth_height = np.linalg.norm(bottom_lip - top_lip)
            
            # Smile typically has higher width/height ratio
            if mouth_height > 0:
                ratio = mouth_width / mouth_height
                smile_score = min(1.0, max(0.0, (ratio - 3.0) / 2.0))  # Normalize to 0-1
                return smile_score
            
            return 0.0
            
        except Exception:
            return 0.0
    
    def _calculate_eye_openness(self, landmarks: np.ndarray) -> float:
        """Calculate average eye openness."""
        try:
            def eye_aspect_ratio(eye_landmarks):
                if len(landmarks) < max(eye_landmarks):
                    return 0.0
                
                # Vertical distances
                A = np.linalg.norm(landmarks[eye_landmarks[1]] - landmarks[eye_landmarks[5]])
                B = np.linalg.norm(landmarks[eye_landmarks[2]] - landmarks[eye_landmarks[4]])
                
                # Horizontal distance
                C = np.linalg.norm(landmarks[eye_landmarks[0]] - landmarks[eye_landmarks[3]])
                
                if C > 0:
                    return (A + B) / (2.0 * C)
                return 0.0
            
            # Calculate for both eyes
            left_ear = eye_aspect_ratio([33, 160, 158, 133, 153, 144])
            right_ear = eye_aspect_ratio([362, 385, 387, 263, 373, 380])
            
            avg_ear = (left_ear + right_ear) / 2.0
            return min(1.0, max(0.0, avg_ear * 3))  # Normalize
            
        except Exception:
            return 0.5  # Default neutral openness
    
    def _calculate_eyebrow_height(self, landmarks: np.ndarray) -> float:
        """Calculate eyebrow height (for detecting surprise/concern)."""
        try:
            if len(landmarks) < 300:
                return 0.5
            
            # Get eyebrow and eye landmarks
            left_eyebrow = landmarks[70]  # Left eyebrow
            left_eye = landmarks[33]  # Left eye
            right_eyebrow = landmarks[296]  # Right eyebrow  
            right_eye = landmarks[362]  # Right eye
            
            # Calculate distances
            left_distance = np.linalg.norm(left_eyebrow - left_eye)
            right_distance = np.linalg.norm(right_eyebrow - right_eye)
            
            avg_distance = (left_distance + right_distance) / 2.0
            return min(1.0, max(0.0, avg_distance * 10))  # Normalize
            
        except Exception:
            return 0.5  # Default neutral height