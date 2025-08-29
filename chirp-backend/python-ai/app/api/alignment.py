import logging
import tempfile
import os
import librosa
import numpy as np
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel, HttpUrl
import httpx

from app.services.model_manager import ModelManager

logger = logging.getLogger(__name__)

router = APIRouter()

class AlignmentRequest(BaseModel):
    text: str
    audio_url: HttpUrl

class PhonemeAlignment(BaseModel):
    phoneme: str
    start: float
    end: float
    confidence: float

class AlignmentResponse(BaseModel):
    phonemes: List[PhonemeAlignment]
    alignment_score: float
    duration: float

async def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state."""
    from app.main import model_manager
    if model_manager is None:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    return model_manager

@router.post("/align", response_model=AlignmentResponse)
async def align_text_to_audio(
    request: AlignmentRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Align text to audio to get phoneme timings."""
    try:
        # Download audio from URL
        audio_path = await download_audio(str(request.audio_url))
        
        try:
            # Perform alignment
            result = await align_text_audio(request.text, audio_path, model_manager)
            return result
        finally:
            # Cleanup downloaded file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                
    except Exception as e:
        logger.error(f"Alignment error: {e}")
        raise HTTPException(status_code=500, detail=f"Text-audio alignment failed: {str(e)}")

@router.post("/align/upload", response_model=AlignmentResponse)
async def align_text_to_uploaded_audio(
    text: str,
    file: UploadFile = File(...),
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Align text to uploaded audio file."""
    try:
        # Validate file type
        if not file.content_type or not (
            file.content_type.startswith('audio/') or 
            file.content_type.startswith('video/')
        ):
            raise HTTPException(status_code=400, detail="File must be audio or video")
        
        # Save uploaded file temporarily
        suffix = '.wav' if file.content_type.startswith('audio/') else '.mp4'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            file_path = temp_file.name
        
        try:
            # Perform alignment
            result = await align_text_audio(text, file_path, model_manager)
            return result
        finally:
            # Cleanup temp file
            if os.path.exists(file_path):
                os.remove(file_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alignment upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Text-audio alignment failed: {str(e)}")

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

async def align_text_audio(
    text: str, 
    audio_path: str, 
    model_manager: ModelManager
) -> AlignmentResponse:
    """Align text to audio using forced alignment techniques."""
    
    try:
        # First, get transcription with word timestamps from Whisper
        transcription_result = await model_manager.transcribe_audio(audio_path)
        
        # Load audio for analysis
        y, sr = librosa.load(audio_path, sr=16000)
        duration = len(y) / sr
        
        # Get word-level timestamps from Whisper
        whisper_words = []
        if "words" in transcription_result:
            whisper_words = transcription_result["words"]
        elif "segments" in transcription_result:
            # Extract words from segments
            for segment in transcription_result["segments"]:
                if "words" in segment:
                    whisper_words.extend(segment["words"])
        
        # Convert text to phonemes (simplified approach)
        target_phonemes = text_to_phonemes(text)
        
        # Align phonemes to audio using word timestamps
        aligned_phonemes = align_phonemes_to_words(
            target_phonemes, 
            whisper_words, 
            text,
            duration
        )
        
        # Calculate alignment score
        alignment_score = calculate_alignment_score(
            transcription_result.get("text", ""),
            text,
            aligned_phonemes
        )
        
        return AlignmentResponse(
            phonemes=aligned_phonemes,
            alignment_score=alignment_score,
            duration=duration
        )
        
    except Exception as e:
        logger.error(f"Text-audio alignment error: {e}")
        
        # Return fallback alignment
        fallback_phonemes = create_fallback_alignment(text)
        
        return AlignmentResponse(
            phonemes=fallback_phonemes,
            alignment_score=0.5,
            duration=1.0
        )

def text_to_phonemes(text: str) -> List[str]:
    """Convert text to phonemes (simplified approach)."""
    # This is a very simplified phoneme mapping
    # In production, you'd use a proper phoneme dictionary like CMU Pronouncing Dictionary
    
    # Basic letter-to-phoneme mapping
    phoneme_map = {
        'a': 'aa', 'e': 'eh', 'i': 'ih', 'o': 'oh', 'u': 'uh',
        'b': 'b', 'c': 'k', 'd': 'd', 'f': 'f', 'g': 'g',
        'h': 'hh', 'j': 'jh', 'k': 'k', 'l': 'l', 'm': 'm',
        'n': 'n', 'p': 'p', 'q': 'k', 'r': 'r', 's': 's',
        't': 't', 'v': 'v', 'w': 'w', 'x': 'ks', 'y': 'y', 'z': 'z'
    }
    
    phonemes = []
    words = text.lower().split()
    
    for word in words:
        # Add silence before word
        phonemes.append('sil')
        
        # Convert letters to phonemes
        for char in word:
            if char.isalpha():
                phonemes.append(phoneme_map.get(char, char))
    
    # Add final silence
    phonemes.append('sil')
    
    return phonemes

def align_phonemes_to_words(
    phonemes: List[str],
    whisper_words: List[Dict[str, Any]],
    original_text: str,
    total_duration: float
) -> List[PhonemeAlignment]:
    """Align phonemes to word timestamps from Whisper."""
    
    aligned_phonemes = []
    
    if not whisper_words:
        # Fallback: distribute phonemes evenly across duration
        return distribute_phonemes_evenly(phonemes, total_duration)
    
    try:
        # Group phonemes by words
        text_words = original_text.lower().split()
        phonemes_per_word = len(phonemes) // max(1, len(text_words))
        
        phoneme_idx = 0
        
        for word_info in whisper_words:
            word_start = float(word_info.get("start", 0.0))
            word_end = float(word_info.get("end", word_start + 0.5))
            word_duration = word_end - word_start
            confidence = float(word_info.get("probability", 0.8))
            
            # Determine how many phonemes for this word
            remaining_phonemes = len(phonemes) - phoneme_idx
            remaining_words = len(whisper_words) - whisper_words.index(word_info)
            
            if remaining_words > 0:
                phonemes_for_word = min(
                    phonemes_per_word,
                    remaining_phonemes // remaining_words + (1 if remaining_phonemes % remaining_words > 0 else 0)
                )
            else:
                phonemes_for_word = remaining_phonemes
            
            # Distribute phonemes within word duration
            if phonemes_for_word > 0:
                phoneme_duration = word_duration / phonemes_for_word
                
                for i in range(phonemes_for_word):
                    if phoneme_idx < len(phonemes):
                        phoneme_start = word_start + (i * phoneme_duration)
                        phoneme_end = phoneme_start + phoneme_duration
                        
                        aligned_phonemes.append(PhonemeAlignment(
                            phoneme=phonemes[phoneme_idx],
                            start=phoneme_start,
                            end=phoneme_end,
                            confidence=confidence
                        ))
                        
                        phoneme_idx += 1
        
        # Add any remaining phonemes
        while phoneme_idx < len(phonemes):
            last_end = aligned_phonemes[-1].end if aligned_phonemes else 0.0
            phoneme_duration = 0.1  # Default 100ms
            
            aligned_phonemes.append(PhonemeAlignment(
                phoneme=phonemes[phoneme_idx],
                start=last_end,
                end=last_end + phoneme_duration,
                confidence=0.5
            ))
            
            phoneme_idx += 1
        
        return aligned_phonemes
        
    except Exception as e:
        logger.warning(f"Error in phoneme alignment: {e}")
        return distribute_phonemes_evenly(phonemes, total_duration)

def distribute_phonemes_evenly(
    phonemes: List[str], 
    total_duration: float
) -> List[PhonemeAlignment]:
    """Distribute phonemes evenly across the total duration."""
    
    if not phonemes:
        return []
    
    phoneme_duration = total_duration / len(phonemes)
    aligned_phonemes = []
    
    for i, phoneme in enumerate(phonemes):
        start_time = i * phoneme_duration
        end_time = start_time + phoneme_duration
        
        aligned_phonemes.append(PhonemeAlignment(
            phoneme=phoneme,
            start=start_time,
            end=end_time,
            confidence=0.5  # Default confidence for even distribution
        ))
    
    return aligned_phonemes

def calculate_alignment_score(
    transcribed_text: str,
    target_text: str,
    aligned_phonemes: List[PhonemeAlignment]
) -> float:
    """Calculate alignment quality score."""
    
    try:
        # Simple text similarity score
        transcribed_words = set(transcribed_text.lower().split())
        target_words = set(target_text.lower().split())
        
        if not target_words:
            return 0.0
        
        # Jaccard similarity
        intersection = len(transcribed_words.intersection(target_words))
        union = len(transcribed_words.union(target_words))
        
        text_similarity = intersection / union if union > 0 else 0.0
        
        # Phoneme coverage score
        phoneme_coverage = len(aligned_phonemes) / max(1, len(target_text.replace(' ', '')))
        phoneme_coverage = min(1.0, phoneme_coverage)
        
        # Confidence score
        if aligned_phonemes:
            avg_confidence = sum(p.confidence for p in aligned_phonemes) / len(aligned_phonemes)
        else:
            avg_confidence = 0.0
        
        # Combine scores
        alignment_score = (text_similarity * 0.5 + phoneme_coverage * 0.3 + avg_confidence * 0.2)
        
        return min(1.0, max(0.0, alignment_score))
        
    except Exception as e:
        logger.warning(f"Error calculating alignment score: {e}")
        return 0.5

def create_fallback_alignment(text: str) -> List[PhonemeAlignment]:
    """Create fallback phoneme alignment when proper alignment fails."""
    
    phonemes = text_to_phonemes(text)
    return distribute_phonemes_evenly(phonemes, 1.0)  # Default 1 second duration