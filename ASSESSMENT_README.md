# Chirp Assessment System

## Overview

The Chirp Assessment System is a comprehensive evaluation tool designed to assess communication skills in autistic children. It evaluates both verbal and non-verbal communication abilities and synchronizes results with a gamified learning experience.

## Features Implemented

### 🎯 Assessment Structure
- **12 comprehensive questions** covering 4 key areas:
  - **Verbal Communication** (4 questions) - 35% weight
  - **Non-verbal Communication** (4 questions) - 30% weight  
  - **Social Interaction** (3 questions) - 25% weight
  - **Comfort Levels** (2 questions) - 10% weight

### 🎤 Speech Recognition
- Real-time speech-to-text conversion using Web Speech API
- Audio level monitoring and visual feedback
- Keyword detection and analysis
- Speech clarity and confidence scoring
- Automatic transcription with fallback support

### 📹 Facial Recognition & Analysis
- Camera-based eye contact tracking
- Facial expression recognition
- Head pose estimation
- Engagement level scoring
- Real-time video analysis with privacy controls

### 🧮 Advanced Scoring Algorithm
- Weighted scoring system based on research
- Individual question scoring with multiple criteria
- Category-specific strengths and improvement identification
- Overall confidence scoring
- Level determination (Beginner/Intermediate/Advanced)

### 🎮 Game Integration
- Dynamic scenario unlocking based on assessment results
- Personalized difficulty adjustment
- Adaptive support levels
- Module recommendations based on performance
- Real-time stats and progress tracking

### 🔒 Privacy & Safety
- Comprehensive privacy controls
- Data minimization options
- Automatic data deletion scheduling
- Recording consent management
- COPPA-compliant data handling
- Export and delete data options

### ⚠️ Error Handling
- Graceful degradation for missing permissions
- Browser compatibility checking
- Network error recovery
- Child-friendly error messages
- Skip options for technical difficulties
- Retry mechanisms with limits

## Technical Architecture

### Core Components

#### Assessment Types (`src/types/assessment.ts`)
```typescript
interface AssessmentResults {
  userId: string;
  timestamp: string;
  overallScore: number;
  categoryScores: CategoryScores;
  detailedMetrics: AssessmentMetrics;
  recommendedLevel: 'beginner' | 'intermediate' | 'advanced';
  suggestedModules: string[];
  personalizedContent: PersonalizedContent;
  confidence: number;
}
```

#### Speech Recognition (`src/components/assessment/SpeechRecorder.tsx`)
- Web Speech API integration
- Real-time transcription
- Audio level visualization
- Keyword matching
- Error handling and fallbacks

#### Facial Recognition (`src/components/assessment/FacialRecognitionCamera.tsx`)
- MediaDevices API for camera access
- Real-time facial analysis simulation
- Eye contact duration tracking
- Emotion detection
- Privacy-aware recording

#### Scoring Engine (`src/utils/assessmentScoring.ts`)
- Multi-criteria evaluation
- Weighted category scoring
- Confidence calculation
- Level determination logic
- Personalized recommendations

#### Game Configuration (`src/utils/gameConfiguration.ts`)
- Dynamic scenario generation
- Adaptive difficulty settings
- Personalized content creation
- Module unlocking logic
- Progress synchronization

### Privacy & Security

#### Privacy Controls (`src/components/assessment/PrivacyControls.tsx`)
- Recording consent management
- Data retention settings
- Sharing preferences
- Auto-deletion scheduling
- Data export functionality

#### Privacy Manager
```typescript
class PrivacyManager {
  static getSettings(): PrivacySettings;
  static saveSettings(settings: PrivacySettings): void;
  static shouldSaveRecording(): boolean;
  static clearAllData(): void;
  static scheduleDataDeletion(): void;
}
```

### Error Handling (`src/components/assessment/ErrorHandler.tsx`)
- Comprehensive error categorization
- Child-friendly error messages
- Recovery suggestions
- Retry mechanisms
- Graceful degradation

## Assessment Flow

### 1. Introduction & Permissions
- Welcome message with Chirpy mascot
- Privacy settings explanation
- Camera/microphone permission requests
- Browser compatibility checking

### 2. Question Types

#### Multiple Choice Questions
- Clear options with visual feedback
- Immediate response validation
- Encouraging feedback for all answers
- Progress indication

#### Speech Questions
- Voice recording with visual feedback
- Real-time transcription display
- Audio level monitoring
- Keyword detection and scoring

#### Facial Recognition Questions
- Camera-based analysis
- Eye contact tracking
- Expression recognition
- Engagement measurement

#### Gesture Questions
- Movement detection
- Appropriateness scoring
- Natural gesture recognition

### 3. Real-time Feedback
- Immediate positive reinforcement
- Progress visualization
- Encouraging mascot interactions
- Error recovery guidance

### 4. Results & Recommendations
- Comprehensive score breakdown
- Category-specific insights
- Personalized learning path
- Game configuration setup

## Game Integration

### Dynamic Content Unlocking
```typescript
// Based on assessment results
const gameConfig = {
  playerLevel: assessmentResults.recommendedLevel,
  unlockedModules: generateModules(results),
  availableScenarios: generateScenarios(results),
  personalizedContent: createPersonalizedContent(results)
};
```

### Adaptive Settings
- Question timeouts based on verbal skills
- Hint frequency based on comfort level
- Difficulty adjustment based on performance variance
- Support level determination

### Module Recommendations
- **Beginner**: Basic greetings, family conversations
- **Intermediate**: School scenarios, peer interactions
- **Advanced**: Complex social situations, group conversations

## Privacy Compliance

### Data Collection Principles
- **Minimal Data**: Only collect what's necessary for assessment
- **Consent-Based**: Clear opt-in for all recording features  
- **Transparent**: Easy-to-understand privacy controls
- **User Control**: Export and delete options available
- **Time-Limited**: Automatic data deletion options

### COPPA Compliance
- Parental consent mechanisms
- Data minimization for children under 13
- Clear privacy policy explanations
- Secure data handling practices

## Browser Support

### Required APIs
- MediaDevices API (camera/microphone access)
- Web Speech API (speech recognition)
- WebRTC (video processing)
- localStorage (data persistence)

### Fallback Support
- Text-based alternatives for speech questions
- Skip options for camera-dependent questions
- Graceful degradation for unsupported browsers
- Manual input alternatives

## Installation & Setup

### Dependencies
```bash
npm install @tensorflow/tfjs @tensorflow-models/face-landmarks-detection @mediapipe/face_mesh
```

### Environment Requirements
- Modern browser with WebRTC support
- HTTPS connection (required for camera/microphone access)
- Sufficient bandwidth for real-time processing

## Usage Examples

### Basic Assessment
```typescript
import { Assessment } from '@/pages/kid/Assessment';

// Component automatically handles:
// - Permission requests
// - Question progression
// - Error handling
// - Results calculation
```

### Privacy Configuration
```typescript
import { PrivacyManager } from '@/components/assessment/PrivacyControls';

// Configure privacy settings
const settings = {
  saveRecordings: false,
  allowDataAnalysis: true,
  autoDeleteAfter: 7
};
PrivacyManager.saveSettings(settings);
```

### Game Integration
```typescript
import { GameConfigurationManager } from '@/utils/gameConfiguration';

// Get personalized game configuration
const gameConfig = GameConfigurationManager.getCurrentGameState();
```

## Performance Considerations

### Optimization Strategies
- Lazy loading of AI models
- Progressive enhancement for advanced features
- Efficient audio/video processing
- Minimal data transmission

### Resource Management
- Automatic cleanup of media streams
- Memory-efficient analysis algorithms
- Compressed data storage
- Background processing optimization

## Testing & Validation

### Accessibility Testing
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode support
- Motor accessibility considerations

### Cross-Browser Testing
- Chrome/Chromium (primary)
- Firefox (secondary)
- Safari (limited support)
- Edge (full support)

### Performance Testing
- Real-time processing latency
- Memory usage monitoring
- Network bandwidth optimization
- Battery usage considerations

## Future Enhancements

### Planned Features
- Advanced AI-powered speech analysis
- More sophisticated facial recognition
- Multi-language support
- Therapist dashboard integration
- Progress tracking over time
- Collaborative features with parents/teachers

### Technical Improvements
- WebAssembly integration for better performance
- Offline capability for core features
- Advanced analytics and reporting
- Cloud-based AI processing options

## Support & Troubleshooting

### Common Issues
1. **Camera/Microphone not working**: Check browser permissions
2. **Poor speech recognition**: Ensure quiet environment
3. **Slow performance**: Close other browser tabs
4. **Data not saving**: Check localStorage availability

### Debug Mode
Enable debug logging by setting `localStorage.setItem('chirp_debug', 'true')`

## Contributing

### Development Guidelines
- Follow TypeScript best practices
- Maintain accessibility standards
- Include comprehensive error handling
- Write child-friendly user interfaces
- Ensure privacy-by-design principles

### Code Structure
```
src/
├── components/assessment/     # Assessment-specific components
├── types/assessment.ts        # Type definitions
├── utils/assessmentScoring.ts # Scoring algorithms
├── utils/gameConfiguration.ts # Game integration
└── pages/kid/Assessment.tsx   # Main assessment page
```

This comprehensive assessment system provides a robust, privacy-conscious, and engaging way to evaluate communication skills in autistic children while seamlessly integrating with the gamified learning experience.