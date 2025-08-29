# Chirp Backend - Conversation Training for Autistic Kids

A production-ready backend system powering the Chirp conversation training app. This system provides AI-powered analysis, real-time communication, and comprehensive data management for helping autistic children develop conversation skills.

## 🏗️ Architecture Overview

### Core Components

1. **Node.js API** (`/node-api`) - Main REST API and WebSocket server
2. **Python AI Service** (`/python-ai`) - Machine learning microservice for video/audio analysis
3. **PostgreSQL** - Primary database with Prisma ORM
4. **Redis** - Caching and job queue management
5. **S3-Compatible Storage** - Media file storage (AWS S3 or MinIO for local dev)

### Key Features

- **Real-time Communication** - Socket.IO for live session updates and avatar cues
- **AI Analysis Pipeline** - Video analysis, speech-to-text, emotion detection, prosody analysis
- **TTS with Viseme Support** - Azure Speech/ElevenLabs integration with lip-sync data
- **Role-based Access Control** - Firebase Auth with comprehensive permission system
- **Privacy-First Design** - Configurable data retention and consent management
- **Scalable Job Processing** - Redis + BullMQ for async analysis tasks

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Firebase Project (for authentication)

### Local Development Setup

1. **Clone and Setup**
```bash
git clone <repository-url>
cd chirp-backend
```

2. **Environment Configuration**
```bash
# Node API
cp node-api/.env.example node-api/.env
# Edit node-api/.env with your Firebase credentials

# Python AI Service  
cp python-ai/.env.example python-ai/.env
```

3. **Start with Docker Compose**
```bash
# Start all services
docker-compose up -d

# Start with management tools (PgAdmin, Redis Commander)
docker-compose --profile tools up -d
```

4. **Initialize Database**
```bash
# Run Prisma migrations
cd node-api
npm run db:push
```

5. **Verify Setup**
- Node API: http://localhost:3000
- Python AI: http://localhost:8000
- API Docs: http://localhost:3000/api-docs
- AI Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (chirp_access/chirp_secret_key)
- PgAdmin: http://localhost:5050 (admin@chirp.local/admin123)

### Manual Setup (without Docker)

<details>
<summary>Click to expand manual setup instructions</summary>

#### 1. Database Setup
```bash
# Install PostgreSQL and create database
createdb chirp_db

# Set DATABASE_URL in node-api/.env
DATABASE_URL="postgresql://username:password@localhost:5432/chirp_db?schema=public"
```

#### 2. Redis Setup
```bash
# Install Redis
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server

# Start Redis
redis-server
```

#### 3. Node API Setup
```bash
cd node-api
npm install
npm run db:generate
npm run db:push
npm run dev
```

#### 4. Python AI Service Setup
```bash
cd python-ai
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

</details>

## 📚 API Documentation

### Authentication

All API endpoints require Firebase authentication. Include the Firebase ID token in the Authorization header:

```bash
Authorization: Bearer <firebase_id_token>
```

### Key Endpoints

#### Session Management
```bash
# Start a conversation session
POST /sessions
{
  "childId": "child_123",
  "scenarioId": "scenario_456"
}

# Upload media for analysis
POST /sessions/{sessionId}/media
Content-Type: multipart/form-data
file: <video/audio file>

# Complete session
POST /sessions/{sessionId}/complete
{
  "resultJson": { /* session results */ }
}
```

#### Child Management
```bash
# Create child profile
POST /children
{
  "name": "Alex",
  "dob": "2015-06-15",
  "guardianIds": ["parent_123"],
  "therapistId": "therapist_456"
}

# Get dashboard data
GET /children/{childId}/dashboard?days=30
```

#### Assessment System
```bash
# Start assessment
POST /assessments/{childId}/start

# Submit results
POST /assessments/{assessmentId}/submit
{
  "rawResults": { /* assessment responses */ }
}
```

### Socket.IO Events

#### Client → Server
- `session:start` - Join a session room
- `session:media_chunk` - Stream media data (optional)

#### Server → Client
- `session:cue:avatar` - Avatar animation and speech cues
- `session:progress` - Session progress updates
- `session:feedback` - Analysis feedback
- `session:reward` - Achievement notifications

### Example Socket.IO Flow

```javascript
// Client connects and joins session
socket.emit('session:start', { sessionId: 'session_123' });

// Server sends avatar cue
socket.on('session:cue:avatar', (data) => {
  // data = {
  //   cue: 'speak',
  //   text: 'Hi! What\'s your name?',
  //   ttsAudioUrl: 'https://...',
  //   visemeTimeline: [
  //     { time: 0.0, viseme: 'M' },
  //     { time: 0.12, viseme: 'AA' },
  //     // ...
  //   ],
  //   mood: 'cheer'
  // }
});

// Server sends progress update
socket.on('session:progress', (data) => {
  // data = { step: 2, percent: 40, message: 'Great job!' }
});
```

## 🤖 AI Analysis Pipeline

### Video Analysis
- **Face Detection** - MediaPipe face mesh
- **Eye Contact Scoring** - Gaze direction estimation
- **Emotion Recognition** - Facial expression classification
- **Engagement Metrics** - Smile detection, attention measurement

### Audio Analysis
- **Speech-to-Text** - OpenAI Whisper with word timestamps
- **Prosody Analysis** - Pitch, energy, speaking rate
- **Speech Clarity** - Articulation and confidence scoring

### Analysis Workflow
1. Media uploaded to session endpoint
2. File stored in S3, analysis job queued
3. Python service processes video/audio
4. Results aggregated using scenario rubric
5. Feedback generated and sent via Socket.IO
6. Companion unlocks and rewards calculated

## 🎭 Rive Integration Specification

> **Important**: The backend cannot create Rive files. This specification must be implemented by designers using Rive Editor.

### Required Rive Asset Structure

#### Artboard: `ChirpBird`
Main companion character artboard

#### State Machine: `Chirp_Bird_SM`
Controls all animations and interactions

#### Required Inputs
```javascript
// Mood control
mood: String (enum: "idle", "cheer", "think", "demo", "celebrate")

// Viseme animation
viseme_index: Number (0-6, maps to viseme types)

// Interaction triggers  
blink: Trigger
hop: Trigger
wing_flap: Trigger
```

#### Required Animations

**Base Animations**
- `idle_breathe` - Subtle breathing animation (loop)
- `wink` - Friendly wink gesture
- `nod` - Encouraging nod
- `celebrate_confetti` - Success celebration

**Viseme Animations** (for lip-sync)
- `speak_viseme_aa` - Open mouth (A, E sounds)
- `speak_viseme_oh` - Round mouth (O, U sounds)  
- `speak_viseme_m` - Closed mouth (M, P, B sounds)
- `speak_viseme_fv` - Lip-teeth contact (F, V sounds)
- `speak_viseme_dd` - Tongue-teeth (D, T, L, N, S, Z sounds)
- `speak_viseme_ch` - Lip protrusion (CH, SH, J sounds)
- `speak_viseme_rest` - Neutral/silence

**Mood States**
- `mood_idle` - Default calm state
- `mood_cheer` - Excited, encouraging
- `mood_think` - Thoughtful, processing
- `mood_demo` - Demonstrative teaching mode
- `mood_celebrate` - Victory celebration

#### Art Requirements

**Base Character**
- Friendly bird design suitable for children
- Bright, appealing colors
- Expressive eyes and beak
- Simple, clean vector art

**Accessory Layers** (unlockable)
- Hat variations (cap, graduation cap, party hat)
- Glasses/sunglasses
- Bow ties/accessories
- Background props (microphone, books, etc.)

**Animation Guidelines**
- Smooth 60fps animations
- Child-friendly expressions
- Clear mouth shapes for visemes
- Bouncy, energetic movement style

### Frontend Integration Code

```javascript
// Initialize Rive
const rive = new Rive({
  src: '/assets/chirp_bird.riv',
  artboard: 'ChirpBird',
  stateMachines: 'Chirp_Bird_SM',
  autoplay: true,
  onLoad: () => {
    // Get state machine inputs
    moodInput = rive.getInput('mood');
    visemeInput = rive.getInput('viseme_index');
    blinkTrigger = rive.getInput('blink');
  }
});

// Handle avatar cues from backend
socket.on('session:cue:avatar', (data) => {
  // Set mood
  moodInput.value = data.mood || 'idle';
  
  // Play TTS audio
  if (data.ttsAudioUrl) {
    const audio = new Audio(data.ttsAudioUrl);
    audio.play();
    
    // Animate visemes
    if (data.visemeTimeline) {
      animateVisemes(data.visemeTimeline);
    }
  }
  
  // Trigger special animations
  if (data.cue === 'wink') blinkTrigger.fire();
});

function animateVisemes(timeline) {
  const visemeMap = {
    'AA': 0, 'EE': 1, 'OH': 2, 'M': 3, 
    'FV': 4, 'DD': 5, 'CH': 6, 'REST': 0
  };
  
  timeline.forEach(frame => {
    setTimeout(() => {
      visemeInput.value = visemeMap[frame.viseme] || 0;
    }, frame.time * 1000);
  });
}
```

### CSS Fallback (if Rive unavailable)

```css
.chirp-avatar {
  width: 200px;
  height: 200px;
  background: url('/sprites/chirp-idle.png');
  animation: breathe 2s ease-in-out infinite;
}

.chirp-avatar.speaking { 
  background: url('/sprites/chirp-speak.png'); 
}
.chirp-avatar.celebrating { 
  background: url('/sprites/chirp-celebrate.png'); 
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
```

## 🔒 Security & Privacy

### Data Protection
- **Consent Management** - Media recording requires explicit parental consent
- **Data Retention** - Configurable retention periods (default 365 days)  
- **Right to Delete** - Complete data purging endpoints
- **Access Control** - Strict RBAC with Firebase authentication

### Security Features
- **Input Validation** - Zod schema validation on all endpoints
- **Rate Limiting** - Request throttling and abuse prevention
- **File Upload Security** - Type validation, size limits, virus scanning ready
- **SQL Injection Prevention** - Prisma ORM with parameterized queries

### Privacy by Design
- **Minimal Data Collection** - Only necessary information stored
- **Pseudonymization** - Personal identifiers separated from analysis data
- **Secure Storage** - Encrypted at rest, HTTPS in transit
- **Audit Logging** - Comprehensive access and modification logs

## 📊 Monitoring & Observability

### Health Checks
- `GET /health` - Service health status
- `GET /health` (Python) - AI service health
- Database connectivity monitoring
- Redis queue status

### Logging
- **Structured Logging** - JSON format with correlation IDs
- **Log Levels** - Configurable (DEBUG, INFO, WARN, ERROR)
- **Request Tracing** - End-to-end request tracking
- **Performance Metrics** - Response times, queue lengths

### Metrics to Monitor
- API response times
- Analysis job queue length
- Database connection pool usage
- Memory and CPU utilization
- Error rates by endpoint
- User session durations

## 🧪 Testing

### Running Tests

```bash
# Node API tests
cd node-api
npm test
npm run test:watch
npm run test:coverage

# Python AI tests  
cd python-ai
pytest
pytest --cov=app
```

### Test Coverage Areas
- **Unit Tests** - Individual service functions
- **Integration Tests** - API endpoint workflows
- **Socket.IO Tests** - Real-time communication
- **Analysis Pipeline Tests** - AI processing workflows
- **Authentication Tests** - Security and permissions

## 🚀 Deployment

### Environment Variables

#### Node API Required Variables
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
S3_BUCKET=chirp-media-prod
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
JWT_SECRET=...
```

#### Python AI Required Variables  
```bash
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
WHISPER_MODEL_SIZE=base
DEVICE=auto
```

### Production Deployment

#### Docker Deployment
```bash
# Build images
docker build -t chirp-api ./node-api
docker build -t chirp-ai ./python-ai

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d
```

#### Cloud Deployment Options

**AWS**
- ECS/Fargate for containerized services
- RDS PostgreSQL for database
- ElastiCache Redis for caching
- S3 for media storage
- CloudFront for API distribution

**Google Cloud**
- Cloud Run for services
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud Storage for media
- Firebase for authentication

**Azure**
- Container Instances
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Blob Storage for media
- Azure Speech Services for TTS

### Scaling Considerations

- **Horizontal Scaling** - Multiple API instances behind load balancer
- **Database Scaling** - Read replicas for analytics queries
- **Queue Scaling** - Multiple worker instances for job processing
- **Storage Scaling** - CDN for media delivery
- **Caching Strategy** - Redis for session data and frequently accessed content

## 🛠️ Development

### Project Structure
```
chirp-backend/
├── node-api/                 # Node.js TypeScript API
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation, etc.
│   │   ├── sockets/         # Socket.IO handlers
│   │   ├── jobs/           # Background job workers
│   │   └── utils/          # Shared utilities
│   ├── prisma/             # Database schema & migrations
│   └── tests/              # Test files
├── python-ai/               # Python FastAPI AI service
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── services/       # AI model management
│   │   ├── models/         # ML model definitions
│   │   └── utils/          # Utilities
│   └── tests/              # Test files
└── docker-compose.yml       # Local development setup
```

### Adding New Features

1. **API Endpoints** - Add to appropriate controller and route
2. **Socket Events** - Update SocketService with new events
3. **Background Jobs** - Create new job processor in jobs/
4. **AI Analysis** - Add new analysis endpoint to Python service
5. **Database Changes** - Update Prisma schema and migrate

### Code Style
- **TypeScript** - Strict mode enabled, full type coverage
- **Python** - Black formatting, type hints required
- **Linting** - ESLint for TS, Flake8 for Python
- **Documentation** - JSDoc for functions, docstrings for Python

## 🤝 Contributing

### Development Workflow
1. Fork repository
2. Create feature branch
3. Implement changes with tests
4. Run linting and tests
5. Submit pull request

### Commit Convention
```
feat: add user authentication
fix: resolve socket connection issue
docs: update API documentation
test: add integration tests for sessions
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

**Database Connection Issues**
```bash
# Check connection
npm run db:studio

# Reset database
npm run db:reset
```

**Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping

# Clear Redis cache
redis-cli flushall
```

**Python AI Service Issues**
```bash
# Check model loading
curl http://localhost:8000/health

# View logs
docker-compose logs python-ai
```

### Getting Help
- Check the [API Documentation](http://localhost:3000/api-docs)
- Review [Socket.IO Events](#socketio-events)
- Examine [Docker Logs](#monitoring--observability)
- Open GitHub Issues for bugs/features

---

**Built with ❤️ for helping autistic children develop conversation skills**