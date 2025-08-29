import logging
import librosa
import numpy as np
import tempfile
import os
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel, HttpUrl
import httpx
import soundfile as sf

from app.services.model_manager import ModelManager

logger = logging.getLogger(__name__)

router = APIRouter()

class AudioAnalysisRequest(BaseModel):
    audio_url: HttpUrl

class AudioAnalysisResponse(BaseModel):
    pitch_mean: float
    pitch_var: float
    energy_mean: float
    speaking_rate: float
    tone_label: str
    prosody_score: float

async def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state."""
    from app.main import model_manager
    if model_manager is None:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    return model_manager

@router.post("/audio", response_model=AudioAnalysisResponse)
async def analyze_audio_from_url(
    request: AudioAnalysisRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Analyze audio from URL."""
    try:
        # Download audio from URL
        audio_path = await download_audio(str(request.audio_url))
        
        try:
            # Analyze audio
            result = await analyze_audio_file(audio_path)
            return result
        finally:
            # Cleanup downloaded file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                
    except Exception as e:
        logger.error(f"Audio analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

@router.post("/audio/upload", response_model=AudioAnalysisResponse)
async def analyze_audio_upload(
    file: UploadFile = File(...),
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Analyze uploaded audio file."""
    try:
        # Validate file type
        if not file.content_type or not (
            file.content_type.startswith('audio/') or 
            file.content_type.startswith('video/')  # Extract audio from video
        ):
            raise HTTPException(status_code=400, detail="File must be audio or video")
        
        # Save uploaded file temporarily
        suffix = '.wav' if file.content_type.startswith('audio/') else '.mp4'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            file_path = temp_file.name
        
        try:
            # Analyze audio
            result = await analyze_audio_file(file_path)
            return result
        finally:
            # Cleanup temp file
            if os.path.exists(file_path):
                os.remove(file_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio upload analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

async def download_audio(url: str) -> str:
    """Download audio from URL to temporary file."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                temp_file.write(response.content)
                return temp_file.name
                
    except Exception as e:
        logger.error(f"Audio download error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download audio: {str(e)}")

async def analyze_audio_file(file_path: str) -> AudioAnalysisResponse:
    """Analyze audio file for prosody and speech characteristics."""
    try:
        # Load audio file
        y, sr = librosa.load(file_path, sr=16000)  # Resample to 16kHz
        
        if len(y) == 0:
            raise ValueError("Empty audio file")
        
        # Extract features
        pitch_features = extract_pitch_features(y, sr)
        energy_features = extract_energy_features(y, sr)
        rhythm_features = extract_rhythm_features(y, sr)
        
        # Calculate prosody score
        prosody_score = calculate_prosody_score(pitch_features, energy_features, rhythm_features)
        
        # Determine tone label
        tone_label = classify_tone(pitch_features, energy_features, rhythm_features)
        
        return AudioAnalysisResponse(
            pitch_mean=float(pitch_features['mean']),
            pitch_var=float(pitch_features['variance']),
            energy_mean=float(energy_features['mean']),
            speaking_rate=float(rhythm_features['speaking_rate']),
            tone_label=tone_label,
            prosody_score=float(prosody_score)
        )
        
    except Exception as e:
        logger.error(f"Audio analysis processing error: {e}")
        raise

def extract_pitch_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """Extract pitch-related features from audio."""
    try:
        # Extract fundamental frequency (F0)
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, 
            fmin=librosa.note_to_hz('C2'),  # ~65 Hz
            fmax=librosa.note_to_hz('C7'),  # ~2093 Hz
            sr=sr
        )
        
        # Remove unvoiced segments
        f0_voiced = f0[voiced_flag]
        
        if len(f0_voiced) == 0:
            # No voiced segments found
            return {
                'mean': 150.0,  # Default fundamental frequency
                'variance': 0.0,
                'range': 0.0,
                'voiced_ratio': 0.0
            }
        
        # Calculate statistics
        pitch_mean = np.nanmean(f0_voiced)
        pitch_var = np.nanvar(f0_voiced)
        pitch_range = np.nanmax(f0_voiced) - np.nanmin(f0_voiced)
        voiced_ratio = np.sum(voiced_flag) / len(voiced_flag)
        
        return {
            'mean': float(pitch_mean),
            'variance': float(pitch_var),
            'range': float(pitch_range),
            'voiced_ratio': float(voiced_ratio)
        }
        
    except Exception as e:
        logger.warning(f"Pitch extraction error: {e}")
        return {
            'mean': 150.0,
            'variance': 100.0,
            'range': 50.0,
            'voiced_ratio': 0.5
        }

def extract_energy_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """Extract energy-related features from audio."""
    try:
        # Calculate RMS energy
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        
        # Calculate spectral centroid (brightness)
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        
        # Calculate zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        
        return {
            'mean': float(np.mean(rms)),
            'variance': float(np.var(rms)),
            'spectral_centroid_mean': float(np.mean(spectral_centroid)),
            'zero_crossing_rate': float(np.mean(zcr))
        }
        
    except Exception as e:
        logger.warning(f"Energy extraction error: {e}")
        return {
            'mean': 0.1,
            'variance': 0.01,
            'spectral_centroid_mean': 2000.0,
            'zero_crossing_rate': 0.1
        }

def extract_rhythm_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """Extract rhythm and timing features from audio."""
    try:
        # Detect onset events (speech segments)
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, units='time')
        
        # Calculate speaking rate (onsets per second)
        duration = len(y) / sr
        speaking_rate = len(onset_frames) / duration if duration > 0 else 0
        
        # Calculate pause statistics
        if len(onset_frames) > 1:
            intervals = np.diff(onset_frames)
            avg_interval = np.mean(intervals)
            interval_variance = np.var(intervals)
        else:
            avg_interval = 0.0
            interval_variance = 0.0
        
        # Estimate speech/pause ratio
        # Use voice activity detection based on energy
        rms = librosa.feature.rms(y=y)[0]
        rms_threshold = np.percentile(rms, 30)  # Bottom 30% is likely silence
        speech_frames = np.sum(rms > rms_threshold)
        speech_ratio = speech_frames / len(rms) if len(rms) > 0 else 0
        
        return {
            'speaking_rate': float(speaking_rate),
            'avg_interval': float(avg_interval),
            'interval_variance': float(interval_variance),
            'speech_ratio': float(speech_ratio)
        }
        
    except Exception as e:
        logger.warning(f"Rhythm extraction error: {e}")
        return {
            'speaking_rate': 2.0,  # Default ~2 syllables per second
            'avg_interval': 0.5,
            'interval_variance': 0.1,
            'speech_ratio': 0.7
        }

def calculate_prosody_score(
    pitch_features: Dict[str, float], 
    energy_features: Dict[str, float], 
    rhythm_features: Dict[str, float]
) -> float:
    """Calculate overall prosody score (0-1)."""
    try:
        score_components = []
        
        # Pitch variation score (more variation is generally better for expressiveness)
        pitch_var_normalized = min(1.0, pitch_features['variance'] / 1000.0)
        score_components.append(pitch_var_normalized * 0.3)
        
        # Energy variation score
        energy_var_normalized = min(1.0, energy_features['variance'] / 0.01)
        score_components.append(energy_var_normalized * 0.2)
        
        # Speaking rate score (optimal range: 1.5-3.0 syllables/second)
        speaking_rate = rhythm_features['speaking_rate']
        if 1.5 <= speaking_rate <= 3.0:
            rate_score = 1.0
        elif speaking_rate < 1.5:
            rate_score = speaking_rate / 1.5
        else:  # speaking_rate > 3.0
            rate_score = max(0.0, 1.0 - (speaking_rate - 3.0) / 2.0)
        
        score_components.append(rate_score * 0.3)
        
        # Speech ratio score (should have good speech/silence balance)
        speech_ratio = rhythm_features['speech_ratio']
        if 0.5 <= speech_ratio <= 0.8:
            ratio_score = 1.0
        else:
            ratio_score = max(0.0, 1.0 - abs(speech_ratio - 0.65) / 0.35)
        
        score_components.append(ratio_score * 0.2)
        
        # Combine scores
        total_score = sum(score_components)
        return min(1.0, max(0.0, total_score))
        
    except Exception as e:
        logger.warning(f"Prosody score calculation error: {e}")
        return 0.5  # Default neutral score

def classify_tone(
    pitch_features: Dict[str, float], 
    energy_features: Dict[str, float], 
    rhythm_features: Dict[str, float]
) -> str:
    """Classify the overall tone of the speech."""
    try:
        pitch_mean = pitch_features['mean']
        pitch_var = pitch_features['variance']
        energy_mean = energy_features['mean']
        speaking_rate = rhythm_features['speaking_rate']
        
        # Simple rule-based tone classification
        if energy_mean > 0.15 and speaking_rate > 2.5:
            if pitch_var > 800:
                return "excited"
            else:
                return "energetic"
        elif energy_mean < 0.05 or speaking_rate < 1.0:
            return "monotone"
        elif pitch_mean > 200 and pitch_var > 500:
            return "expressive"
        elif speaking_rate < 1.5 and pitch_var < 300:
            return "calm"
        elif pitch_var > 1000:
            return "animated"
        else:
            return "neutral"
            
    except Exception:
        return "neutral"