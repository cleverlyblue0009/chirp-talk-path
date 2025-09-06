// Conversational Assessment Types for Chirp Interactive Experience

export interface BirdCharacter {
  id: string;
  name: string;
  personality: 'encouraging' | 'playful' | 'wise' | 'gentle';
  riveAssetPath: string;
  voiceSettings: {
    pitch: number;
    speed: number;
    voice: string;
  };
  specialties: string[];
}

export interface ConversationSegment {
  id: string;
  title: string;
  description: string;
  primaryBird: string;
  supportingBirds?: string[];
  objectives: string[];
  expectedDuration: number; // in seconds
  adaptiveScenarios: AdaptiveScenario[];
}

export interface AdaptiveScenario {
  triggerCondition: 'anxious' | 'excited' | 'disengaged' | 'confident' | 'overwhelmed';
  response: {
    birdBehavior: BirdBehaviorChange;
    speechModification: SpeechModification;
    interactionAdjustment: InteractionAdjustment;
  };
}

export interface BirdBehaviorChange {
  mood: 'idle' | 'cheer' | 'think' | 'demo' | 'celebrate' | 'comfort';
  animationIntensity: 'gentle' | 'normal' | 'energetic';
  eyeContact: 'direct' | 'soft' | 'avoidant';
  gestures: 'minimal' | 'supportive' | 'enthusiastic';
}

export interface SpeechModification {
  speed: number; // 0.5 - 2.0
  pitch: number; // -10 to +10
  volume: number; // 0.1 - 1.0
  pauseDuration: number; // milliseconds between sentences
  complexity: 'simple' | 'normal' | 'detailed';
}

export interface InteractionAdjustment {
  questionComplexity: 'basic' | 'moderate' | 'advanced';
  waitTime: number; // seconds to wait for response
  promptFrequency: 'never' | 'rare' | 'normal' | 'frequent';
  encouragementLevel: 'subtle' | 'normal' | 'high';
}

// Real-time Analysis Data Structures
export interface RealTimeAnalysisState {
  current: {
    facialEmotion: EmotionState;
    eyeContact: EyeContactState;
    speechMetrics: LiveSpeechMetrics;
    engagementLevel: EngagementState;
    comfortLevel: ComfortState;
  };
  trends: {
    emotionHistory: EmotionPoint[];
    engagementHistory: EngagementPoint[];
    responseLatency: number[];
  };
  adaptiveState: {
    currentDifficulty: 'easy' | 'medium' | 'hard';
    supportLevel: 'minimal' | 'moderate' | 'high';
    recommendedAdjustments: string[];
  };
}

export interface EmotionState {
  primary: string;
  confidence: number;
  valence: number; // -1 (negative) to +1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  stability: number; // how stable the emotion has been
}

export interface EyeContactState {
  isLookingAtCamera: boolean;
  duration: number; // current continuous duration
  frequency: number; // contacts per minute
  quality: 'natural' | 'forced' | 'avoidant';
  gazePattern: 'focused' | 'wandering' | 'distracted';
}

export interface LiveSpeechMetrics {
  isActive: boolean;
  currentVolume: number;
  clarity: number;
  pace: number; // words per minute
  enthusiasm: number; // 0-100 based on intonation
  naturalness: number; // 0-100, scripted vs conversational
}

export interface EngagementState {
  level: number; // 0-100
  indicators: {
    attention: boolean;
    participation: boolean;
    curiosity: boolean;
    enjoyment: boolean;
  };
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface ComfortState {
  level: number; // 0-100
  indicators: {
    relaxed: boolean;
    confident: boolean;
    overwhelmed: boolean;
    withdrawn: boolean;
  };
  recommendation: 'continue' | 'slow_down' | 'encourage' | 'break';
}

export interface EmotionPoint {
  timestamp: number;
  emotion: string;
  confidence: number;
  valence: number;
}

export interface EngagementPoint {
  timestamp: number;
  level: number;
  factors: string[];
}

// Conversation Flow Management
export interface ConversationFlow {
  currentSegment: string;
  completedSegments: string[];
  upcomingSegments: string[];
  adaptations: FlowAdaptation[];
  sessionMetrics: SessionMetrics;
}

export interface FlowAdaptation {
  timestamp: number;
  trigger: string;
  change: string;
  reason: string;
  effectiveness?: number; // measured post-change
}

export interface SessionMetrics {
  startTime: number;
  duration: number;
  totalInteractions: number;
  successfulExchanges: number;
  adaptationCount: number;
  overallEngagement: number;
  skillDemonstrations: SkillDemonstration[];
}

export interface SkillDemonstration {
  skill: string;
  demonstrated: boolean;
  confidence: number;
  context: string;
  timestamp: number;
  evidence: string[]; // specific behaviors observed
}

// Bird Conversation System
export interface BirdConversationState {
  activeBirds: BirdCharacter[];
  currentSpeaker: string;
  conversationMode: 'introduction' | 'assessment' | 'encouragement' | 'celebration';
  turnHistory: ConversationTurn[];
  dynamicResponses: DynamicResponse[];
}

export interface ConversationTurn {
  speaker: 'child' | string; // string is bird ID
  content: string;
  timestamp: number;
  duration: number;
  analysis?: TurnAnalysis;
}

export interface TurnAnalysis {
  speechQuality: number;
  emotionalAppropriate: boolean;
  reciprocity: boolean;
  engagement: number;
  skillsDisplayed: string[];
}

export interface DynamicResponse {
  trigger: string;
  birdId: string;
  response: string;
  animation: BirdBehaviorChange;
  priority: number;
}

// Assessment Scoring (Invisible to Child)
export interface ConversationalAssessmentScore {
  overallScore: number;
  categoryScores: {
    verbalCommunication: ConversationalSkillScore;
    nonVerbalCommunication: ConversationalSkillScore;
    socialEngagement: ConversationalSkillScore;
    emotionalRegulation: ConversationalSkillScore;
    adaptability: ConversationalSkillScore;
  };
  naturalBehaviors: NaturalBehavior[];
  conversationHighlights: ConversationHighlight[];
  developmentAreas: DevelopmentArea[];
  strengths: Strength[];
}

export interface ConversationalSkillScore {
  score: number; // 0-100
  confidence: number; // 0-100
  evidence: EvidencePoint[];
  trend: 'improving' | 'stable' | 'needs_attention';
  comparison: 'above_typical' | 'typical' | 'below_typical';
}

export interface EvidencePoint {
  skill: string;
  demonstration: string;
  timestamp: number;
  strength: number; // 0-100
  context: string;
}

export interface NaturalBehavior {
  behavior: string;
  frequency: number;
  appropriateness: number;
  spontaneity: number;
  examples: string[];
}

export interface ConversationHighlight {
  moment: string;
  description: string;
  skillsShown: string[];
  timestamp: number;
  videoClip?: string; // URL to video segment
}

export interface DevelopmentArea {
  area: string;
  currentLevel: string;
  targetLevel: string;
  suggestions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface Strength {
  strength: string;
  description: string;
  examples: string[];
  buildUpon: string[];
}

// Game Configuration Output
export interface PersonalizedGameConfig {
  childProfile: ChildProfile;
  birdCompanions: BirdCharacter[];
  scenarioPreferences: ScenarioPreference[];
  communicationStyle: CommunicationStyleConfig;
  difficultyProgression: DifficultyConfig;
  motivationFactors: MotivationFactor[];
}

export interface ChildProfile {
  communicationStrengths: string[];
  areasForGrowth: string[];
  preferredInteractionStyle: 'verbal' | 'visual' | 'gestural' | 'mixed';
  comfortZones: string[];
  interestTopics: string[];
  socialPreferences: 'one_on_one' | 'small_group' | 'flexible';
}

export interface ScenarioPreference {
  scenarioType: string;
  preferenceLevel: number; // 0-100
  reasonsForPreference: string[];
  adaptations: string[];
}

export interface CommunicationStyleConfig {
  preferredPace: 'slow' | 'medium' | 'fast';
  processingTime: number; // seconds needed to respond
  feedbackStyle: 'immediate' | 'delayed' | 'summary';
  encouragementFrequency: 'high' | 'medium' | 'low';
  visualSupports: boolean;
}

export interface DifficultyConfig {
  startingLevel: 'beginner' | 'intermediate' | 'advanced';
  progressionRate: 'slow' | 'medium' | 'fast';
  adaptiveThresholds: {
    increaseThreshold: number; // success rate to increase difficulty
    decreaseThreshold: number; // struggle rate to decrease difficulty
  };
  skillFocus: string[]; // prioritized skills to work on
}

export interface MotivationFactor {
  factor: string;
  effectiveness: number; // 0-100
  examples: string[];
  whenToUse: string[];
}

// Assessment Configuration
export interface ConversationalAssessmentConfig {
  sessionDuration: number; // target duration in minutes
  segments: ConversationSegment[];
  birds: BirdCharacter[];
  adaptiveSettings: {
    enableRealTimeAdaptation: boolean;
    adaptationSensitivity: number; // 0-100
    maxAdaptationsPerSession: number;
  };
  analysisSettings: {
    enableFacialAnalysis: boolean;
    enableSpeechAnalysis: boolean;
    enableEyeTracking: boolean;
    analysisFrequency: number; // milliseconds between analysis
  };
  privacySettings: {
    saveVideoRecordings: boolean;
    saveAudioRecordings: boolean;
    dataRetentionDays: number;
    shareWithTherapist: boolean;
  };
}

// Default Conversation Segments
export const DEFAULT_CONVERSATION_SEGMENTS: ConversationSegment[] = [
  {
    id: 'opening_comfort',
    title: 'Meeting New Friends',
    description: 'Chirpy introduces themselves and makes the child comfortable',
    primaryBird: 'chirpy',
    objectives: ['establish_rapport', 'assess_comfort_level', 'introduce_concept'],
    expectedDuration: 120,
    adaptiveScenarios: [
      {
        triggerCondition: 'anxious',
        response: {
          birdBehavior: {
            mood: 'comfort',
            animationIntensity: 'gentle',
            eyeContact: 'soft',
            gestures: 'minimal'
          },
          speechModification: {
            speed: 0.8,
            pitch: -2,
            volume: 0.7,
            pauseDuration: 2000,
            complexity: 'simple'
          },
          interactionAdjustment: {
            questionComplexity: 'basic',
            waitTime: 10,
            promptFrequency: 'rare',
            encouragementLevel: 'high'
          }
        }
      }
    ]
  },
  {
    id: 'favorite_things',
    title: 'Sharing What We Love',
    description: 'Discovering the child\'s interests and passions',
    primaryBird: 'chirpy',
    supportingBirds: ['buddy'],
    objectives: ['assess_enthusiasm', 'measure_spontaneity', 'evaluate_detail_sharing'],
    expectedDuration: 180,
    adaptiveScenarios: [
      {
        triggerCondition: 'excited',
        response: {
          birdBehavior: {
            mood: 'cheer',
            animationIntensity: 'energetic',
            eyeContact: 'direct',
            gestures: 'enthusiastic'
          },
          speechModification: {
            speed: 1.1,
            pitch: 2,
            volume: 0.9,
            pauseDuration: 500,
            complexity: 'normal'
          },
          interactionAdjustment: {
            questionComplexity: 'moderate',
            waitTime: 5,
            promptFrequency: 'normal',
            encouragementLevel: 'normal'
          }
        }
      }
    ]
  },
  {
    id: 'social_introduction',
    title: 'Meeting Buddy Bird',
    description: 'Introducing a second character to assess social navigation',
    primaryBird: 'buddy',
    supportingBirds: ['chirpy'],
    objectives: ['assess_social_comfort', 'evaluate_introduction_skills', 'measure_group_interaction'],
    expectedDuration: 150,
    adaptiveScenarios: []
  },
  {
    id: 'emotion_recognition',
    title: 'Feeling Detective Game',
    description: 'Birds show different emotions for the child to identify',
    primaryBird: 'chirpy',
    supportingBirds: ['buddy'],
    objectives: ['assess_emotion_recognition', 'evaluate_empathy', 'measure_facial_mirroring'],
    expectedDuration: 200,
    adaptiveScenarios: []
  },
  {
    id: 'story_sharing',
    title: 'Story Time Together',
    description: 'Reciprocal storytelling to assess narrative skills',
    primaryBird: 'chirpy',
    objectives: ['assess_listening_skills', 'evaluate_narrative_ability', 'measure_reciprocity'],
    expectedDuration: 240,
    adaptiveScenarios: []
  }
];

// Default Bird Characters
export const DEFAULT_BIRD_CHARACTERS: BirdCharacter[] = [
  {
    id: 'chirpy',
    name: 'Chirpy',
    personality: 'encouraging',
    riveAssetPath: '/assets/chirp_bird.riv',
    voiceSettings: {
      pitch: 0,
      speed: 1.0,
      voice: 'en-US-Standard-F'
    },
    specialties: ['introduction', 'encouragement', 'assessment_guidance']
  },
  {
    id: 'buddy',
    name: 'Buddy',
    personality: 'playful',
    riveAssetPath: '/assets/buddy_bird.riv',
    voiceSettings: {
      pitch: 2,
      speed: 1.1,
      voice: 'en-US-Standard-C'
    },
    specialties: ['social_interaction', 'games', 'peer_modeling']
  },
  {
    id: 'wise',
    name: 'Professor Hoot',
    personality: 'wise',
    riveAssetPath: '/assets/wise_bird.riv',
    voiceSettings: {
      pitch: -1,
      speed: 0.9,
      voice: 'en-US-Standard-D'
    },
    specialties: ['complex_topics', 'problem_solving', 'reflection']
  }
];