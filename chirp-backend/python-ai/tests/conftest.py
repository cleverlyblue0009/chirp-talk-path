import pytest
import asyncio
from unittest.mock import Mock, patch
import numpy as np

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_model_manager():
    """Mock ModelManager for testing."""
    manager = Mock()
    
    # Mock Whisper model
    manager.whisper_model = Mock()
    manager.transcribe_audio.return_value = {
        "text": "Hello, how are you?",
        "words": [
            {"word": "Hello", "start": 0.0, "end": 0.5, "probability": 0.9},
            {"word": "how", "start": 0.6, "end": 0.8, "probability": 0.95},
            {"word": "are", "start": 0.9, "end": 1.1, "probability": 0.92},
            {"word": "you", "start": 1.2, "end": 1.5, "probability": 0.88}
        ],
        "language": "en"
    }
    
    # Mock MediaPipe components
    manager.get_face_mesh.return_value = Mock()
    manager.get_face_detection.return_value = Mock()
    
    # Mock emotion classifier
    manager.classify_emotion.return_value = {
        "happy": 0.6,
        "neutral": 0.3,
        "confused": 0.1
    }
    
    # Mock health check
    manager.health_check.return_value = {
        "mediapipe": True,
        "whisper": True,
        "emotion_classifier": True
    }
    
    return manager

@pytest.fixture
def sample_audio_data():
    """Generate sample audio data for testing."""
    # Generate 1 second of sample audio at 16kHz
    sample_rate = 16000
    duration = 1.0
    samples = int(sample_rate * duration)
    
    # Generate a simple sine wave
    t = np.linspace(0, duration, samples, False)
    audio = 0.3 * np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
    
    return audio.astype(np.float32), sample_rate

@pytest.fixture
def sample_video_frame():
    """Generate a sample video frame for testing."""
    # Create a 640x480 RGB frame
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    return frame

@pytest.fixture
def sample_face_landmarks():
    """Generate sample face landmarks for testing."""
    # MediaPipe face mesh has 468 landmarks
    landmarks = []
    for i in range(468):
        # Create normalized coordinates (0-1 range)
        x = np.random.random()
        y = np.random.random()
        z = np.random.random() * 0.1  # Depth is typically small
        landmarks.append(Mock(x=x, y=y, z=z))
    
    return landmarks

@pytest.fixture
def mock_cv2():
    """Mock OpenCV for video processing tests."""
    with patch('cv2.VideoCapture') as mock_cap_class:
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_cap.get.side_effect = lambda prop: {
            0: 30.0,    # CAP_PROP_FPS
            7: 900,     # CAP_PROP_FRAME_COUNT
        }.get(prop, 0)
        
        # Mock frame reading
        sample_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        mock_cap.read.return_value = (True, sample_frame)
        
        mock_cap_class.return_value = mock_cap
        yield mock_cap

@pytest.fixture
def mock_librosa():
    """Mock librosa for audio processing tests."""
    with patch('librosa.load') as mock_load:
        # Return sample audio data
        sample_rate = 16000
        duration = 2.0
        samples = int(sample_rate * duration)
        audio = np.random.random(samples).astype(np.float32)
        
        mock_load.return_value = (audio, sample_rate)
        
        # Mock other librosa functions
        with patch('librosa.feature.rms') as mock_rms, \
             patch('librosa.feature.spectral_centroid') as mock_centroid, \
             patch('librosa.feature.zero_crossing_rate') as mock_zcr, \
             patch('librosa.pyin') as mock_pyin, \
             patch('librosa.onset.onset_detect') as mock_onset:
            
            # Mock feature extraction results
            mock_rms.return_value = np.array([[0.1, 0.15, 0.12, 0.08]])
            mock_centroid.return_value = np.array([[2000, 2500, 2200, 1800]])
            mock_zcr.return_value = np.array([[0.1, 0.12, 0.09, 0.11]])
            
            # Mock pitch detection
            f0 = np.array([150, 160, 155, 0, 165, 170])  # Some unvoiced frames
            voiced_flag = np.array([True, True, True, False, True, True])
            voiced_probs = np.array([0.9, 0.95, 0.85, 0.1, 0.92, 0.88])
            mock_pyin.return_value = (f0, voiced_flag, voiced_probs)
            
            # Mock onset detection
            mock_onset.return_value = np.array([0.1, 0.5, 1.0, 1.5])
            
            yield {
                'load': mock_load,
                'rms': mock_rms,
                'centroid': mock_centroid,
                'zcr': mock_zcr,
                'pyin': mock_pyin,
                'onset': mock_onset
            }

@pytest.fixture
def mock_httpx():
    """Mock httpx for HTTP requests in tests."""
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = Mock()
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.content = b"fake_audio_data"
        
        mock_client.get.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client
        mock_client_class.return_value.__aexit__.return_value = None
        
        yield mock_client

@pytest.fixture
def temp_audio_file(tmp_path, sample_audio_data):
    """Create a temporary audio file for testing."""
    import soundfile as sf
    
    audio_data, sample_rate = sample_audio_data
    temp_file = tmp_path / "test_audio.wav"
    
    # Write audio data to file
    sf.write(str(temp_file), audio_data, sample_rate)
    
    return str(temp_file)

@pytest.fixture
def temp_video_file(tmp_path):
    """Create a temporary video file for testing."""
    # For testing purposes, we'll just create a dummy file
    # In a real implementation, you might use OpenCV to create a test video
    temp_file = tmp_path / "test_video.mp4"
    temp_file.write_bytes(b"fake_video_data")
    
    return str(temp_file)

@pytest.fixture(autouse=True)
def mock_app_model_manager():
    """Mock the global model manager in the main app."""
    with patch('app.main.model_manager') as mock_manager:
        # Configure the mock to return our test model manager
        mock_manager.health_check.return_value = {
            "mediapipe": True,
            "whisper": True,
            "emotion_classifier": True
        }
        yield mock_manager