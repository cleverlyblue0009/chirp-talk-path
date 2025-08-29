# Chirp API Examples

This document provides sample cURL commands for testing the Chirp API endpoints.

## Authentication

First, obtain a Firebase ID token from your frontend application, then exchange it for an internal token:

```bash
# Exchange Firebase token for internal token
curl -X POST http://localhost:3000/auth/firebase-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "your_firebase_id_token_here",
    "role": "PARENT"
  }'

# Response will include a JWT token to use in subsequent requests
# Export it as an environment variable:
export CHIRP_TOKEN="your_jwt_token_here"
```

## Child Management

```bash
# Create a new child
curl -X POST http://localhost:3000/children \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Johnson",
    "dob": "2015-06-15T00:00:00.000Z",
    "guardianIds": ["parent_user_id"],
    "therapistId": "therapist_user_id"
  }'

# Get children list
curl -X GET http://localhost:3000/children \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Get child dashboard
curl -X GET "http://localhost:3000/children/child_123/dashboard?days=30" \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Update child information
curl -X PUT http://localhost:3000/children/child_123 \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alexander Johnson",
    "consentMedia": true
  }'
```

## Assessment System

```bash
# Start assessment for a child
curl -X POST http://localhost:3000/assessments/child_123/start \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Submit assessment results
curl -X POST http://localhost:3000/assessments/assessment_123/submit \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rawResults": {
      "responses": [
        {"questionId": "social_comfort", "selectedOption": 1},
        {"questionId": "eye_contact", "selectedOption": 0},
        {"questionId": "conversation_initiation", "selectedOption": 2}
      ]
    }
  }'

# Get assessment results
curl -X GET http://localhost:3000/assessments/child_123 \
  -H "Authorization: Bearer $CHIRP_TOKEN"
```

## Session Management

```bash
# Start a new session
curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "child_123",
    "scenarioId": "scenario_456",
    "moduleId": "greeting_module"
  }'

# Upload media to session (replace with actual video file)
curl -X POST http://localhost:3000/sessions/session_123/media \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -F "file=@/path/to/video.mp4"

# Complete session
curl -X POST http://localhost:3000/sessions/session_123/complete \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resultJson": {
      "overall_score": 0.85,
      "user_responses": ["Hello!", "My name is Alex", "I like playing games"]
    }
  }'

# Get session details
curl -X GET http://localhost:3000/sessions/session_123 \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Get sessions for a child
curl -X GET "http://localhost:3000/sessions?childId=child_123&limit=10" \
  -H "Authorization: Bearer $CHIRP_TOKEN"
```

## Scenario Management (Therapist/Admin only)

```bash
# Create a new scenario
curl -X POST http://localhost:3000/scenarios \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meeting a New Friend",
    "tags": ["greeting", "social_interaction"],
    "difficulty": 2,
    "description": "Practice introducing yourself to a new friend at school"
  }'

# Generate scenario preview
curl -X POST http://localhost:3000/therapist/scenario/generate \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Create a scenario about asking for help in the classroom",
    "difficulty": 3,
    "tags": ["help_request", "classroom"]
  }'

# Get scenarios list
curl -X GET "http://localhost:3000/scenarios?difficulty=2&limit=10" \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Get specific scenario
curl -X GET http://localhost:3000/scenarios/scenario_123 \
  -H "Authorization: Bearer $CHIRP_TOKEN"
```

## Analysis and Reports

```bash
# Get child summary report (parent-friendly)
curl -X GET http://localhost:3000/analysis/child_123/summary \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Get clinical report (therapist only)
curl -X GET http://localhost:3000/analysis/child_123/clinical \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Get analysis trends
curl -X GET "http://localhost:3000/analysis/child_123/trends?days=30" \
  -H "Authorization: Bearer $CHIRP_TOKEN"
```

## Media Management

```bash
# Get media file URL
curl -X GET "http://localhost:3000/media/media_key_123?expires=3600" \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# List media files for a child (therapist/admin only)
curl -X GET "http://localhost:3000/media?childId=child_123" \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Delete media file
curl -X DELETE http://localhost:3000/media/media_key_123 \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# Get media storage stats (admin only)
curl -X GET http://localhost:3000/media/stats \
  -H "Authorization: Bearer $CHIRP_TOKEN"
```

## Python AI Service Examples

```bash
# Analyze video from URL
curl -X POST http://localhost:8000/analyze/video \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://example.com/sample_video.mp4"
  }'

# Upload video for analysis
curl -X POST http://localhost:8000/analyze/video/upload \
  -F "file=@/path/to/video.mp4"

# Speech-to-text from URL
curl -X POST http://localhost:8000/stt \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/sample_audio.wav",
    "language": "en"
  }'

# Upload audio for STT
curl -X POST http://localhost:8000/stt/upload \
  -F "file=@/path/to/audio.wav" \
  -F "language=en"

# Analyze audio for prosody
curl -X POST http://localhost:8000/analyze/audio \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/sample_audio.wav"
  }'

# Generate scenario
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Create a conversation about sharing toys at recess",
    "difficulty": 2,
    "tags": ["sharing", "playground", "social_skills"]
  }'

# Align text to audio
curl -X POST http://localhost:8000/align \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you today?",
    "audio_url": "https://example.com/speech.wav"
  }'
```

## Health Checks

```bash
# Check Node API health
curl -X GET http://localhost:3000/health

# Check Python AI service health
curl -X GET http://localhost:8000/health

# Check specific service status
curl -X GET http://localhost:8000/health | jq '.services'
```

## Socket.IO Testing

For Socket.IO testing, you can use a WebSocket client or the browser console:

```javascript
// Connect to Socket.IO
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});

// Join a session
socket.emit('session:start', { sessionId: 'session_123' });

// Listen for avatar cues
socket.on('session:cue:avatar', (data) => {
  console.log('Avatar cue received:', data);
  // data.cue, data.text, data.ttsAudioUrl, data.visemeTimeline
});

// Listen for progress updates
socket.on('session:progress', (data) => {
  console.log('Progress:', data);
  // data.step, data.percent, data.message
});

// Listen for feedback
socket.on('session:feedback', (data) => {
  console.log('Feedback:', data);
  // data.scoreDelta, data.gentleText, data.suggestion
});

// Listen for rewards
socket.on('session:reward', (data) => {
  console.log('Reward:', data);
  // data.coins, data.companionUnlocked, data.message
});
```

## Error Handling Examples

```bash
# Test invalid authentication
curl -X GET http://localhost:3000/children \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized

# Test missing required fields
curl -X POST http://localhost:3000/children \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 Bad Request with validation errors

# Test access to unauthorized resource
curl -X GET http://localhost:3000/children/unauthorized_child_id/dashboard \
  -H "Authorization: Bearer $CHIRP_TOKEN"
# Expected: 403 Forbidden

# Test non-existent resource
curl -X GET http://localhost:3000/children/nonexistent_id/dashboard \
  -H "Authorization: Bearer $CHIRP_TOKEN"
# Expected: 404 Not Found
```

## Complete End-to-End Flow Example

```bash
# 1. Authenticate
export CHIRP_TOKEN=$(curl -X POST http://localhost:3000/auth/firebase-login \
  -H "Content-Type: application/json" \
  -d '{"idToken": "your_firebase_token", "role": "PARENT"}' \
  | jq -r '.token')

# 2. Create a child
CHILD_ID=$(curl -X POST http://localhost:3000/children \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Child", "guardianIds": ["parent_id"]}' \
  | jq -r '.id')

# 3. Start assessment
curl -X POST http://localhost:3000/assessments/$CHILD_ID/start \
  -H "Authorization: Bearer $CHIRP_TOKEN"

# 4. Submit assessment
curl -X POST http://localhost:3000/assessments/temp-$CHILD_ID-*/submit \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rawResults": {"responses": [{"questionId": "social_comfort", "selectedOption": 1}]}}'

# 5. Start session
SESSION_ID=$(curl -X POST http://localhost:3000/sessions \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"childId\": \"$CHILD_ID\"}" \
  | jq -r '.sessionId')

# 6. Upload media (replace with actual file)
curl -X POST http://localhost:3000/sessions/$SESSION_ID/media \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -F "file=@sample_video.mp4"

# 7. Complete session
curl -X POST http://localhost:3000/sessions/$SESSION_ID/complete \
  -H "Authorization: Bearer $CHIRP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resultJson": {"overall_score": 0.8}}'

# 8. Get dashboard
curl -X GET http://localhost:3000/children/$CHILD_ID/dashboard \
  -H "Authorization: Bearer $CHIRP_TOKEN"
```

## Notes

- Replace `your_firebase_id_token_here` with actual Firebase ID tokens
- Replace file paths with actual media files for upload testing
- All timestamps are in ISO 8601 format
- Scores are typically in the range 0.0 to 1.0
- The API uses standard HTTP status codes for responses
- All endpoints return JSON responses
- File uploads use multipart/form-data encoding