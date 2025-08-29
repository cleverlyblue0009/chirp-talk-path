import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv

from app.api import video_analysis, audio_analysis, stt, scenario_generation, alignment
from app.services.model_manager import ModelManager
from app.utils.logging_config import setup_logging

# Load environment variables
load_dotenv()

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Global model manager instance
model_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    global model_manager
    
    # Startup
    logger.info("Starting Chirp AI Service...")
    try:
        model_manager = ModelManager()
        await model_manager.initialize()
        logger.info("AI Service started successfully")
        yield
    except Exception as e:
        logger.error(f"Failed to start AI service: {e}")
        raise
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    if model_manager:
        await model_manager.cleanup()
    logger.info("AI Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Chirp AI Service",
    description="AI microservice for video/audio analysis, STT, and scenario generation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get model manager
async def get_model_manager() -> ModelManager:
    global model_manager
    if model_manager is None:
        raise HTTPException(status_code=503, detail="AI service not initialized")
    return model_manager

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    global model_manager
    
    health_status = {
        "status": "healthy",
        "timestamp": os.popen("date -u +%Y-%m-%dT%H:%M:%SZ").read().strip(),
        "services": {
            "mediapipe": False,
            "whisper": False,
            "emotion_classifier": False,
        }
    }
    
    if model_manager:
        health_status["services"] = await model_manager.health_check()
    
    all_healthy = all(health_status["services"].values())
    status_code = 200 if all_healthy else 503
    
    if not all_healthy:
        health_status["status"] = "degraded"
    
    return JSONResponse(content=health_status, status_code=status_code)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Chirp AI Service",
        "version": "1.0.0",
        "description": "AI microservice for conversation analysis",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "video_analysis": "/analyze/video",
            "audio_analysis": "/analyze/audio", 
            "stt": "/stt",
            "scenario_generation": "/generate",
            "alignment": "/align"
        }
    }

# Include API routers
app.include_router(
    video_analysis.router,
    prefix="/analyze",
    tags=["Video Analysis"],
    dependencies=[Depends(get_model_manager)]
)

app.include_router(
    audio_analysis.router,
    prefix="/analyze", 
    tags=["Audio Analysis"],
    dependencies=[Depends(get_model_manager)]
)

app.include_router(
    stt.router,
    tags=["Speech-to-Text"],
    dependencies=[Depends(get_model_manager)]
)

app.include_router(
    scenario_generation.router,
    tags=["Scenario Generation"],
    dependencies=[Depends(get_model_manager)]
)

app.include_router(
    alignment.router,
    tags=["Audio Alignment"],
    dependencies=[Depends(get_model_manager)]
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT", "development") == "development",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )