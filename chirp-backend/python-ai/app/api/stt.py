import logging
import tempfile
import os
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel, HttpUrl
import httpx

from app.services.model_manager import ModelManager

logger = logging.getLogger(__name__)

router = APIRouter()

class STTRequest(BaseModel):
    audio_url: HttpUrl
    language: str = "en"

class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: float

class STTResponse(BaseModel):
    transcript: str
    words: List[WordTimestamp]
    language: str
    confidence: float

async def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state."""
    from app.main import model_manager
    if model_manager is None:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    return model_manager

@router.post("/stt", response_model=STTResponse)
async def transcribe_audio_from_url(
    request: STTRequest,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Transcribe audio from URL using Whisper."""
    try:
        # Download audio from URL
        audio_path = await download_audio(str(request.audio_url))
        
        try:
            # Transcribe audio
            result = await transcribe_audio_file(audio_path, model_manager, request.language)
            return result
        finally:
            # Cleanup downloaded file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                
    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")

@router.post("/stt/upload", response_model=STTResponse)
async def transcribe_audio_upload(
    file: UploadFile = File(...),
    language: str = "en",
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Transcribe uploaded audio file using Whisper."""
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
            # Transcribe audio
            result = await transcribe_audio_file(file_path, model_manager, language)
            return result
        finally:
            # Cleanup temp file
            if os.path.exists(file_path):
                os.remove(file_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")

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

async def transcribe_audio_file(
    file_path: str, 
    model_manager: ModelManager, 
    language: str = "en"
) -> STTResponse:
    """Transcribe audio file using Whisper."""
    try:
        # Use Whisper model for transcription
        result = await model_manager.transcribe_audio(file_path)
        
        # Extract transcript
        transcript = result.get("text", "").strip()
        
        # Extract word-level timestamps if available
        words = []
        if "words" in result:
            for word_info in result["words"]:
                words.append(WordTimestamp(
                    word=word_info.get("word", ""),
                    start=float(word_info.get("start", 0.0)),
                    end=float(word_info.get("end", 0.0)),
                    confidence=float(word_info.get("probability", 1.0))
                ))
        else:
            # If word-level timestamps not available, create approximate ones
            words = create_approximate_word_timestamps(transcript, result.get("segments", []))
        
        # Calculate overall confidence
        if words:
            overall_confidence = sum(word.confidence for word in words) / len(words)
        else:
            overall_confidence = 1.0 if transcript else 0.0
        
        # Detect language if not specified or if detection is available
        detected_language = result.get("language", language)
        
        return STTResponse(
            transcript=transcript,
            words=words,
            language=detected_language,
            confidence=overall_confidence
        )
        
    except Exception as e:
        logger.error(f"Whisper transcription error: {e}")
        
        # Return fallback response
        return STTResponse(
            transcript="[Audio could not be processed]",
            words=[],
            language=language,
            confidence=0.0
        )

def create_approximate_word_timestamps(
    transcript: str, 
    segments: List[Dict[str, Any]]
) -> List[WordTimestamp]:
    """Create approximate word timestamps from segment-level information."""
    words = []
    
    if not transcript or not segments:
        return words
    
    try:
        for segment in segments:
            segment_text = segment.get("text", "").strip()
            segment_start = segment.get("start", 0.0)
            segment_end = segment.get("end", segment_start + 1.0)
            segment_duration = segment_end - segment_start
            
            # Split segment text into words
            segment_words = segment_text.split()
            
            if segment_words:
                # Distribute time evenly across words
                word_duration = segment_duration / len(segment_words)
                
                for i, word in enumerate(segment_words):
                    word_start = segment_start + (i * word_duration)
                    word_end = word_start + word_duration
                    
                    words.append(WordTimestamp(
                        word=word,
                        start=word_start,
                        end=word_end,
                        confidence=0.8  # Default confidence
                    ))
        
        return words
        
    except Exception as e:
        logger.warning(f"Error creating word timestamps: {e}")
        
        # Fallback: create single word for entire transcript
        if transcript:
            words.append(WordTimestamp(
                word=transcript,
                start=0.0,
                end=1.0,
                confidence=0.5
            ))
        
        return words

@router.get("/stt/languages")
async def get_supported_languages():
    """Get list of supported languages for STT."""
    # Whisper supports many languages
    supported_languages = {
        "en": "English",
        "es": "Spanish", 
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "pt": "Portuguese",
        "ru": "Russian",
        "ja": "Japanese",
        "ko": "Korean",
        "zh": "Chinese",
        "ar": "Arabic",
        "hi": "Hindi",
        "auto": "Auto-detect"
    }
    
    return {
        "supported_languages": supported_languages,
        "default": "en",
        "auto_detect_available": True
    }