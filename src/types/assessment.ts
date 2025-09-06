// Assessment Types and Interfaces for Chirp

export interface AssessmentQuestion {
  id: string;
  category: 'verbal' | 'nonverbal' | 'social' | 'comfort';
  type: 'mcq' | 'speech' | 'facial' | 'gesture' | 'scenario';
  question: string;
  instruction?: string;
  options?: string[];
  correctAnswer?: number;
  expectedKeywords?: string[];
  timeLimit?: number; // in seconds
  requiresCamera?: boolean;
  requiresMicrophone?: boolean;
}

export interface AssessmentMetrics {
  speechClarity: number; // 0-100
  eyeContactDuration: number; // in seconds
  responseTime: number; // in milliseconds
  gestureAccuracy: number; // 0-100
  emotionRecognition: number; // 0-100
  questionFormation: number; // 0-100
  conversationFlow: number; // 0-100
  socialCueRecognition: number; // 0-100
}

export interface CategoryScore {
  score: number; // 0-100
  strengths: string[];
  improvementAreas: string[];
  specificMetrics: Partial<AssessmentMetrics>;
}

export interface AssessmentResults {
  userId: string;
  timestamp: string;
  overallScore: number; // 0-100
  categoryScores: {
    verbalCommunication: CategoryScore;
    nonVerbalCommunication: CategoryScore;
    socialInteraction: CategoryScore;
    comfortLevel: CategoryScore;
  };
  detailedMetrics: AssessmentMetrics;
  recommendedLevel: 'beginner' | 'intermediate' | 'advanced';
  suggestedModules: string[];
  personalizedContent: {
    preferredScenarios: string[];
    avoidScenarios: string[];
    supportNeeds: string[];
  };
  confidence: number; // Assessment confidence level 0-100
}

export interface QuestionResponse {
  questionId: string;
  selectedAnswer?: number;
  spokenResponse?: string;
  audioBlob?: Blob;
  videoBlob?: Blob;
  responseTime: number;
  attempts: number;
  confidence: number;
  analysisData?: {
    speechAnalysis?: SpeechAnalysisResult;
    facialAnalysis?: FacialAnalysisResult;
    gestureAnalysis?: GestureAnalysisResult;
  };
}

export interface SpeechAnalysisResult {
  transcription: string;
  clarity: number; // 0-100
  volume: number; // 0-100
  pace: number; // words per minute
  keywordsFound: string[];
  sentimentScore: number; // -1 to 1
  confidence: number; // 0-100
}

export interface FacialAnalysisResult {
  eyeContact: {
    duration: number;
    frequency: number;
    quality: number; // 0-100
  };
  expressions: {
    emotion: string;
    confidence: number;
    duration: number;
  }[];
  headPose: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  overallEngagement: number; // 0-100
}

export interface GestureAnalysisResult {
  gesturesDetected: {
    type: string;
    confidence: number;
    timing: number;
  }[];
  appropriateness: number; // 0-100
  naturalness: number; // 0-100
}

export interface AssessmentConfig {
  enableSpeechRecognition: boolean;
  enableFacialRecognition: boolean;
  enableGestureDetection: boolean;
  maxRecordingTime: number;
  autoAdvanceTime: number;
  privacyMode: boolean;
  saveRecordings: boolean;
}

// Game Configuration based on Assessment Results
export interface GameConfiguration {
  playerLevel: 'beginner' | 'intermediate' | 'advanced';
  unlockedModules: string[];
  currentScore: number;
  streak: number;
  lives: number;
  availableScenarios: ScenarioConfig[];
  personalizedContent: PersonalizedContent;
  adaptiveSettings: AdaptiveSettings;
}

export interface ScenarioConfig {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  unlocked: boolean;
  recommended: boolean;
  supportLevel: 'minimal' | 'moderate' | 'high';
}

export interface PersonalizedContent {
  preferredTopics: string[];
  communicationStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  pacePreference: 'slow' | 'medium' | 'fast';
  feedbackStyle: 'encouraging' | 'detailed' | 'minimal';
}

export interface AdaptiveSettings {
  questionTimeouts: number;
  hintFrequency: 'never' | 'rarely' | 'sometimes' | 'often';
  difficultyAdjustment: boolean;
  skipOption: boolean;
  repeatOption: boolean;
}

// Assessment Questions Database
export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // Verbal Communication Questions (4-5 questions)
  {
    id: 'verbal_1',
    category: 'verbal',
    type: 'speech',
    question: "When someone says 'Hi!' to you, what do you usually say back?",
    instruction: "Please speak your answer out loud. There's no wrong answer!",
    expectedKeywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon'],
    timeLimit: 10,
    requiresMicrophone: true
  },
  {
    id: 'verbal_2',
    category: 'verbal',
    type: 'speech',
    question: "Can you tell me your name and one thing you really like to do?",
    instruction: "Take your time and tell me about yourself!",
    expectedKeywords: ['name', 'like', 'love', 'enjoy', 'play', 'read', 'draw'],
    timeLimit: 15,
    requiresMicrophone: true
  },
  {
    id: 'verbal_3',
    category: 'verbal',
    type: 'speech',
    question: "If you want to know someone's favorite color, what would you ask them?",
    instruction: "Practice asking a question!",
    expectedKeywords: ['what', 'favorite', 'color', 'like', 'best'],
    timeLimit: 10,
    requiresMicrophone: true
  },
  {
    id: 'verbal_4',
    category: 'verbal',
    type: 'speech',
    question: "Tell me about something fun you did recently or something you're looking forward to.",
    instruction: "Share a story with me! Take your time.",
    expectedKeywords: ['fun', 'played', 'went', 'did', 'excited', 'looking forward'],
    timeLimit: 20,
    requiresMicrophone: true
  },

  // Non-verbal Communication Questions (3-4 questions)
  {
    id: 'nonverbal_1',
    category: 'nonverbal',
    type: 'facial',
    question: "Look at the camera and tell me about your day so far.",
    instruction: "Look at the camera while you speak. I want to see your friendly face!",
    timeLimit: 15,
    requiresCamera: true,
    requiresMicrophone: true
  },
  {
    id: 'nonverbal_2',
    category: 'nonverbal',
    type: 'mcq',
    question: "When you see this face 😊, how do you think this person is feeling?",
    options: ['Happy and friendly', 'Sad', 'Angry', 'Scared'],
    correctAnswer: 0
  },
  {
    id: 'nonverbal_3',
    category: 'nonverbal',
    type: 'gesture',
    question: "Can you show me how you wave goodbye to a friend?",
    instruction: "Wave at the camera like you're saying goodbye to a good friend!",
    timeLimit: 10,
    requiresCamera: true
  },
  {
    id: 'nonverbal_4',
    category: 'nonverbal',
    type: 'mcq',
    question: "If someone is frowning and looking down, they might be feeling...",
    options: ['Very happy', 'Sad or upset', 'Excited', 'Hungry'],
    correctAnswer: 1
  },

  // Social Interaction Questions (2-3 questions)
  {
    id: 'social_1',
    category: 'social',
    type: 'mcq',
    question: "When you want to join a group of kids playing, what's a good way to ask?",
    options: [
      "Just start playing without asking",
      "Say 'Can I play with you?'",
      "Wait until they notice you",
      "Take their toys"
    ],
    correctAnswer: 1
  },
  {
    id: 'social_2',
    category: 'social',
    type: 'scenario',
    question: "Your friend is telling you about their pet. What should you do?",
    options: [
      "Start talking about something else",
      "Listen and ask questions about their pet",
      "Walk away",
      "Only talk about your own pets"
    ],
    correctAnswer: 1
  },
  {
    id: 'social_3',
    category: 'social',
    type: 'mcq',
    question: "If someone asks you a question but you don't understand, what should you do?",
    options: [
      "Pretend you understand",
      "Say 'I don't know' and walk away",
      "Ask them to explain it again",
      "Ignore them"
    ],
    correctAnswer: 2
  },

  // Comfort Level Questions (1-2 questions)
  {
    id: 'comfort_1',
    category: 'comfort',
    type: 'mcq',
    question: "How do you feel about talking to new people?",
    options: [
      "I love meeting new people!",
      "It's okay, sometimes I like it",
      "I feel a little nervous but I try",
      "I prefer not to talk to new people"
    ],
    correctAnswer: -1 // No correct answer, all are valid
  },
  {
    id: 'comfort_2',
    category: 'comfort',
    type: 'mcq',
    question: "When you're in a group conversation, you usually...",
    options: [
      "Talk a lot and share many stories",
      "Listen mostly and talk sometimes",
      "Feel quiet but enjoy listening",
      "Feel uncomfortable and want to leave"
    ],
    correctAnswer: -1 // No correct answer, all are valid
  }
];