import { Role, JobStatus } from '@prisma/client';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: Role;
  displayName?: string;
}

export interface CreateChildRequest {
  name: string;
  dob?: string;
  guardianIds: string[];
  therapistId?: string;
}

export interface CreateChildResponse {
  id: string;
  name: string;
  level: number;
  createdAt: string;
}

export interface DashboardResponse {
  lessonsCompleted: number;
  streak: number;
  avgScore: number;
  practiceTime: number; // in minutes
  recentSessions: SessionSummary[];
  companionsUnlocked: number;
  nextMilestone?: {
    type: string;
    progress: number;
    target: number;
  };
}

export interface SessionSummary {
  id: string;
  scenarioTitle?: string;
  completedAt: string;
  score?: number;
  duration: number; // in minutes
}

export interface StartSessionRequest {
  childId: string;
  scenarioId?: string;
  moduleId?: string;
}

export interface StartSessionResponse {
  sessionId: string;
  status: 'created';
}

export interface CompleteSessionRequest {
  resultJson: any;
}

export interface CompleteSessionResponse {
  sessionId: string;
  rewards?: RewardData[];
  unlocks?: CompanionUnlock[];
}

export interface RewardData {
  type: 'coins' | 'xp' | 'streak';
  amount: number;
  reason: string;
}

export interface CompanionUnlock {
  type: string;
  meta?: any;
}

export interface AssessmentStartResponse {
  assessmentId: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'scenario' | 'media_response';
  question: string;
  options?: string[];
  mediaUrl?: string;
}

export interface AssessmentSubmitRequest {
  rawResults: any;
}

export interface AssessmentSubmitResponse {
  level: number;
  strengths: string[];
  areasForGrowth: string[];
  recommendedModules: string[];
}

export interface CreateScenarioRequest {
  title: string;
  tags: string[];
  difficulty: number;
  description: string;
}

export interface ScenarioResponse {
  id: string;
  title: string;
  tags: string[];
  difficulty: number;
  scriptJson: any;
  rubricJson: any;
  createdAt: string;
}

export interface GenerateScenarioRequest {
  text: string;
  difficulty?: number;
  tags?: string[];
}

export interface GenerateScenarioResponse {
  scriptJson: any;
  rubricJson: any;
  preview: string;
}

// Socket.IO Event Types
export interface SocketEvents {
  // Client to Server
  'session:start': (data: { sessionId: string }) => void;
  'session:media_chunk': (data: { sessionId: string; chunk: Buffer }) => void;
  
  // Server to Client
  'session:cue:avatar': (data: {
    cue: 'speak' | 'nod' | 'wink' | 'celebrate';
    text?: string;
    visemeTimeline?: VisemeFrame[];
    ttsAudioUrl?: string;
    mood?: 'idle' | 'cheer' | 'think' | 'demo' | 'celebrate';
  }) => void;
  
  'session:progress': (data: {
    step: number;
    percent: number;
    message?: string;
  }) => void;
  
  'session:feedback': (data: {
    scoreDelta: number;
    gentleText: string;
    suggestion: string;
    exampleResponse?: string;
    ttsUrl?: string;
  }) => void;
  
  'session:reward': (data: {
    coins: number;
    companionUnlocked?: CompanionUnlock;
    message: string;
  }) => void;
}

export interface VisemeFrame {
  time: number; // seconds from start
  viseme: string; // AA, EE, OH, M, FV, REST, etc.
}

// Analysis Types
export interface VideoAnalysisResult {
  face_landmarks: any;
  eye_contact_score: number;
  smile_prob: number;
  expression: {
    happy: number;
    neutral: number;
    confused: number;
    frustrated?: number;
    excited?: number;
  };
  gaze: {
    left: number;
    center: number;
    right: number;
  };
  timestamps: Array<{
    start: number;
    end: number;
    tag: string;
  }>;
}

export interface AudioAnalysisResult {
  pitch_mean: number;
  pitch_var: number;
  energy_mean: number;
  speaking_rate: number;
  tone_label: string;
  prosody_score: number;
}

export interface STTResult {
  transcript: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface AnalysisJobPayload {
  sessionId: string;
  childId: string;
  mediaRef: string;
  scenarioId?: string;
  moduleId?: string;
}

export interface AggregatedAnalysis {
  overall_score: number;
  eye_contact_score: number;
  speech_clarity: number;
  prosody_score: number;
  engagement_level: number;
  turn_taking_markers: number;
  transcript: string;
  feedback_suggestions: string[];
  strengths: string[];
  areas_for_improvement: string[];
}

// TTS Types
export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  returnPhonemes?: boolean;
}

export interface TTSResponse {
  audioUrl: string;
  phonemes?: Array<{
    phoneme: string;
    start: number;
    end: number;
  }>;
  visemeTimeline?: VisemeFrame[];
}

// Companion System Types
export interface CompanionRule {
  id: string;
  name: string;
  description: string;
  condition: {
    type: 'score_threshold' | 'session_count' | 'streak' | 'milestone';
    value: number;
    metric?: string;
  };
  reward: {
    type: string;
    meta: any;
  };
}

export interface ChildSummaryReport {
  childId: string;
  name: string;
  totalSessions: number;
  avgScore: number;
  practiceMinutes: number;
  strengthAreas: string[];
  improvementAreas: string[];
  recentProgress: Array<{
    date: string;
    score: number;
    activity: string;
  }>;
  companionsEarned: number;
  currentStreak: number;
  lastActive: string;
}

export interface ClinicalReport extends ChildSummaryReport {
  detailedMetrics: {
    eyeContactTrend: number[];
    speechClarityTrend: number[];
    prosodyTrend: number[];
    engagementTrend: number[];
  };
  sessionBreakdown: Array<{
    sessionId: string;
    date: string;
    scenario: string;
    rawScores: any;
    clinicalNotes: string[];
  }>;
  recommendations: string[];
  goalProgress: Array<{
    goal: string;
    progress: number;
    target: number;
  }>;
}

export { Role, JobStatus };