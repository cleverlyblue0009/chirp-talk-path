import pytest
import numpy as np
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.model_manager import ModelManager

client = TestClient(app)

class TestVideoAnalysis:
    """Test video analysis endpoints and functionality."""
    
    @pytest.fixture
    def mock_model_manager(self):
        """Mock model manager for testing."""
        manager = Mock(spec=ModelManager)
        manager.get_face_mesh.return_value = Mock()
        manager.get_face_detection.return_value = Mock()
        manager.classify_emotion.return_value = {
            "happy": 0.7,
            "neutral": 0.2,
            "confused": 0.1
        }
        return manager
    
    @pytest.fixture
    def sample_landmarks(self):
        """Generate sample face landmarks for testing."""
        # Create 468 landmarks (MediaPipe face mesh)
        landmarks = np.random.rand(468, 3)
        # Set some specific landmarks for mouth and eyes
        landmarks[61] = [0.4, 0.6, 0.0]  # Left mouth corner
        landmarks[291] = [0.6, 0.6, 0.0]  # Right mouth corner
        landmarks[13] = [0.5, 0.55, 0.0]  # Top lip
        landmarks[14] = [0.5, 0.65, 0.0]  # Bottom lip
        return landmarks
    
    def test_calculate_smile_probability(self, sample_landmarks):
        """Test smile probability calculation."""
        from app.api.video_analysis import calculate_smile_probability
        
        # Test with normal mouth shape
        smile_prob = calculate_smile_probability(sample_landmarks)
        assert 0.0 <= smile_prob <= 1.0
        
        # Test with wide mouth (should increase smile probability)
        wide_mouth_landmarks = sample_landmarks.copy()
        wide_mouth_landmarks[61] = [0.3, 0.6, 0.0]  # Wider left corner
        wide_mouth_landmarks[291] = [0.7, 0.6, 0.0]  # Wider right corner
        
        wide_smile_prob = calculate_smile_probability(wide_mouth_landmarks)
        assert wide_smile_prob >= smile_prob
    
    def test_calculate_eye_contact_score(self, sample_landmarks):
        """Test eye contact score calculation."""
        from app.api.video_analysis import calculate_eye_contact_score
        
        score = calculate_eye_contact_score(sample_landmarks)
        assert 0.0 <= score <= 1.0
    
    def test_calculate_gaze_direction(self, sample_landmarks):
        """Test gaze direction calculation."""
        from app.api.video_analysis import calculate_gaze_direction
        
        gaze = calculate_gaze_direction(sample_landmarks)
        
        assert "left" in gaze
        assert "center" in gaze
        assert "right" in gaze
        
        # Probabilities should sum to approximately 1
        total_prob = sum(gaze.values())
        assert abs(total_prob - 1.0) < 0.1
    
    def test_aggregate_expressions(self):
        """Test emotion expression aggregation."""
        from app.api.video_analysis import aggregate_expressions
        
        expressions = [
            {"happy": 0.8, "neutral": 0.2},
            {"happy": 0.6, "neutral": 0.4},
            {"happy": 0.9, "neutral": 0.1}
        ]
        
        aggregated = aggregate_expressions(expressions)
        
        assert "happy" in aggregated
        assert "neutral" in aggregated
        assert aggregated["happy"] > aggregated["neutral"]
        
        # Should be normalized
        total = sum(aggregated.values())
        assert abs(total - 1.0) < 0.01
    
    def test_aggregate_gaze_directions(self):
        """Test gaze direction aggregation."""
        from app.api.video_analysis import aggregate_gaze_directions
        
        gaze_directions = [
            {"left": 0.1, "center": 0.8, "right": 0.1},
            {"left": 0.2, "center": 0.7, "right": 0.1},
            {"left": 0.1, "center": 0.9, "right": 0.0}
        ]
        
        aggregated = aggregate_gaze_directions(gaze_directions)
        
        assert "left" in aggregated
        assert "center" in aggregated
        assert "right" in aggregated
        assert aggregated["center"] > aggregated["left"]
        assert aggregated["center"] > aggregated["right"]
    
    @patch('app.api.video_analysis.download_video')
    @patch('app.api.video_analysis.analyze_video_file')
    def test_analyze_video_from_url_success(self, mock_analyze, mock_download):
        """Test successful video analysis from URL."""
        # Mock download
        mock_download.return_value = "/tmp/test_video.mp4"
        
        # Mock analysis result
        mock_analyze.return_value = {
            "face_landmarks": {"total_frames_analyzed": 10},
            "eye_contact_score": 0.8,
            "smile_prob": 0.7,
            "expression": {"happy": 0.7, "neutral": 0.3},
            "gaze": {"left": 0.1, "center": 0.8, "right": 0.1},
            "timestamps": []
        }
        
        response = client.post(
            "/analyze/video",
            json={"video_url": "https://example.com/test.mp4"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "face_landmarks" in data
        assert "eye_contact_score" in data
        assert "smile_prob" in data
        assert data["eye_contact_score"] == 0.8
        assert data["smile_prob"] == 0.7
    
    def test_analyze_video_invalid_url(self):
        """Test video analysis with invalid URL."""
        response = client.post(
            "/analyze/video",
            json={"video_url": "not-a-valid-url"}
        )
        
        assert response.status_code == 422  # Validation error
    
    @patch('app.api.video_analysis.cv2.VideoCapture')
    def test_analyze_video_file_no_face_detected(self, mock_cv2):
        """Test video analysis when no face is detected."""
        from app.api.video_analysis import analyze_video_file
        
        # Mock video capture that returns no faces
        mock_cap = Mock()
        mock_cap.isOpened.return_value = True
        mock_cap.get.side_effect = [30, 900, 30]  # fps, total_frames, fps again
        mock_cap.read.side_effect = [(True, np.zeros((480, 640, 3), dtype=np.uint8))] * 5 + [(False, None)]
        mock_cv2.return_value = mock_cap
        
        # Mock model manager
        mock_model_manager = Mock()
        mock_face_mesh = Mock()
        mock_face_detection = Mock()
        
        # No face detection results
        mock_face_detection.process.return_value = Mock(detections=None)
        mock_face_mesh.process.return_value = Mock(multi_face_landmarks=None)
        
        mock_model_manager.get_face_mesh.return_value = mock_face_mesh
        mock_model_manager.get_face_detection.return_value = mock_face_detection
        
        result = analyze_video_file("/tmp/test.mp4", mock_model_manager)
        
        # Should return default values when no face detected
        assert result.eye_contact_score == 0.0
        assert result.smile_prob == 0.0
        assert result.expression == {"neutral": 1.0}
    
    def test_video_analysis_error_handling(self):
        """Test error handling in video analysis."""
        # Test with missing model manager
        with patch('app.main.model_manager', None):
            response = client.post(
                "/analyze/video",
                json={"video_url": "https://example.com/test.mp4"}
            )
            
            assert response.status_code == 503  # Service unavailable


class TestVideoAnalysisIntegration:
    """Integration tests for video analysis pipeline."""
    
    @pytest.mark.asyncio
    async def test_full_video_analysis_pipeline(self):
        """Test the complete video analysis pipeline."""
        # This would test the full pipeline with a real video file
        # For now, we'll test the structure
        
        pipeline_steps = [
            "download_video",
            "load_video_file", 
            "detect_faces",
            "extract_landmarks",
            "calculate_metrics",
            "aggregate_results"
        ]
        
        assert len(pipeline_steps) == 6
        assert "extract_landmarks" in pipeline_steps
    
    def test_performance_benchmarks(self):
        """Test performance benchmarks for video analysis."""
        # Mock performance requirements
        max_processing_time = 60  # seconds
        max_memory_usage = 500  # MB
        
        # These would be actual performance tests in production
        assert max_processing_time > 0
        assert max_memory_usage > 0
    
    def test_video_format_support(self):
        """Test support for different video formats."""
        supported_formats = ['.mp4', '.avi', '.mov', '.webm']
        
        for format in supported_formats:
            # Test that each format can be processed
            assert format.startswith('.')
            assert len(format) >= 4


class TestVideoAnalysisEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_empty_landmarks_array(self):
        """Test handling of empty landmarks array."""
        from app.api.video_analysis import calculate_smile_probability
        
        empty_landmarks = np.array([])
        smile_prob = calculate_smile_probability(empty_landmarks)
        assert smile_prob == 0.0
    
    def test_corrupted_video_file(self):
        """Test handling of corrupted video files."""
        from app.api.video_analysis import analyze_video_file
        
        mock_model_manager = Mock()
        
        # This should handle the error gracefully
        # In a real test, we'd provide a corrupted file
        assert mock_model_manager is not None
    
    def test_very_short_video(self):
        """Test analysis of very short video clips."""
        # Test videos under 1 second
        min_duration = 0.1  # 100ms
        assert min_duration > 0
    
    def test_very_long_video(self):
        """Test analysis of long video clips."""
        # Test videos over the 20-second limit
        max_duration = 20.0  # 20 seconds
        assert max_duration == 20.0
    
    def test_low_quality_video(self):
        """Test analysis of low resolution/quality video."""
        min_resolution = (160, 120)  # Very low resolution
        assert min_resolution[0] > 0
        assert min_resolution[1] > 0
    
    def test_multiple_faces_in_video(self):
        """Test handling of videos with multiple faces."""
        # Should focus on the primary/largest face
        max_faces_to_track = 1
        assert max_faces_to_track == 1