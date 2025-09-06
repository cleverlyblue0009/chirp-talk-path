import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { 
  RealTimeAnalysisState, 
  EmotionState, 
  EyeContactState, 
  LiveSpeechMetrics, 
  EngagementState, 
  ComfortState 
} from '@/types/conversational-assessment';

interface RealTimeAnalysisEngineProps {
  onAnalysisUpdate: (analysis: RealTimeAnalysisState) => void;
  enableFacialAnalysis?: boolean;
  enableSpeechAnalysis?: boolean;
  enableEyeTracking?: boolean;
  analysisFrequency?: number;
  isActive?: boolean;
}

export function RealTimeAnalysisEngine({
  onAnalysisUpdate,
  enableFacialAnalysis = true,
  enableSpeechAnalysis = true,
  enableEyeTracking = true,
  analysisFrequency = 500,
  isActive = false
}: RealTimeAnalysisEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Analysis state
  const [analysisState, setAnalysisState] = useState<RealTimeAnalysisState>({
    current: {
      facialEmotion: {
        primary: 'neutral',
        confidence: 0,
        valence: 0,
        arousal: 0,
        stability: 0
      },
      eyeContact: {
        isLookingAtCamera: false,
        duration: 0,
        frequency: 0,
        quality: 'natural',
        gazePattern: 'focused'
      },
      speechMetrics: {
        isActive: false,
        currentVolume: 0,
        clarity: 0,
        pace: 0,
        enthusiasm: 0,
        naturalness: 0
      },
      engagementLevel: {
        level: 50,
        indicators: {
          attention: false,
          participation: false,
          curiosity: false,
          enjoyment: false
        },
        trend: 'stable'
      },
      comfortLevel: {
        level: 50,
        indicators: {
          relaxed: false,
          confident: false,
          overwhelmed: false,
          withdrawn: false
        },
        recommendation: 'continue'
      }
    },
    trends: {
      emotionHistory: [],
      engagementHistory: [],
      responseLatency: []
    },
    adaptiveState: {
      currentDifficulty: 'medium',
      supportLevel: 'moderate',
      recommendedAdjustments: []
    }
  });

  // Data buffers for trend analysis
  const emotionHistoryRef = useRef<Array<{timestamp: number, emotion: string, confidence: number, valence: number}>>([]);
  const engagementHistoryRef = useRef<Array<{timestamp: number, level: number, factors: string[]}>>([]);
  const responseLatencyRef = useRef<number[]>([]);
  const audioLevelsRef = useRef<number[]>([]);
  const eyeContactHistoryRef = useRef<Array<{timestamp: number, duration: number}>>([]);

  // Initialize media streams
  const initializeMediaStreams = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Set up video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('Video stream ready for analysis');
        };
      }

      // Set up audio analysis
      if (enableSpeechAnalysis) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.3;
        source.connect(analyserRef.current);

        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          speechRecognitionRef.current = new SpeechRecognition();
          speechRecognitionRef.current.continuous = true;
          speechRecognitionRef.current.interimResults = true;
          speechRecognitionRef.current.lang = 'en-US';
        }
      }

    } catch (error) {
      console.error('Failed to initialize media streams:', error);
    }
  }, [enableSpeechAnalysis]);

  // Facial emotion analysis (simplified - in production use TensorFlow.js models)
  const analyzeFacialEmotion = useCallback((): EmotionState => {
    if (!videoRef.current || !canvasRef.current || !enableFacialAnalysis) {
      return analysisState.current.facialEmotion;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return analysisState.current.facialEmotion;

    // Draw current frame for analysis
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Simulate emotion detection (replace with actual ML model)
    const emotions = ['happy', 'sad', 'neutral', 'excited', 'confused', 'focused'];
    const primaryEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    // Simulate more realistic emotion patterns
    const confidence = 0.6 + Math.random() * 0.4;
    let valence = 0;
    let arousal = 0;

    switch (primaryEmotion) {
      case 'happy':
        valence = 0.7 + Math.random() * 0.3;
        arousal = 0.6 + Math.random() * 0.3;
        break;
      case 'excited':
        valence = 0.8 + Math.random() * 0.2;
        arousal = 0.8 + Math.random() * 0.2;
        break;
      case 'sad':
        valence = -0.6 - Math.random() * 0.3;
        arousal = 0.3 + Math.random() * 0.3;
        break;
      case 'confused':
        valence = -0.2 + Math.random() * 0.4;
        arousal = 0.5 + Math.random() * 0.3;
        break;
      case 'focused':
        valence = 0.2 + Math.random() * 0.3;
        arousal = 0.7 + Math.random() * 0.2;
        break;
      default:
        valence = -0.1 + Math.random() * 0.2;
        arousal = 0.3 + Math.random() * 0.4;
    }

    // Calculate stability based on recent history
    const recentEmotions = emotionHistoryRef.current.slice(-10);
    const stability = recentEmotions.length > 0 
      ? recentEmotions.filter(e => e.emotion === primaryEmotion).length / recentEmotions.length
      : 0;

    const emotionState: EmotionState = {
      primary: primaryEmotion,
      confidence,
      valence,
      arousal,
      stability
    };

    // Update history
    emotionHistoryRef.current.push({
      timestamp: Date.now(),
      emotion: primaryEmotion,
      confidence,
      valence
    });

    // Keep only recent history (last 2 minutes)
    const twoMinutesAgo = Date.now() - 120000;
    emotionHistoryRef.current = emotionHistoryRef.current.filter(e => e.timestamp > twoMinutesAgo);

    return emotionState;
  }, [enableFacialAnalysis, analysisState.current.facialEmotion]);

  // Eye contact analysis (simplified - in production use eye tracking library)
  const analyzeEyeContact = useCallback((): EyeContactState => {
    if (!enableEyeTracking) {
      return analysisState.current.eyeContact;
    }

    // Simulate eye contact detection
    const isLookingAtCamera = Math.random() > 0.4; // 60% chance
    const currentTime = Date.now();
    
    // Update continuous duration
    const lastState = analysisState.current.eyeContact;
    const duration = isLookingAtCamera 
      ? (lastState.isLookingAtCamera ? lastState.duration + 0.5 : 0.5)
      : 0;

    // Calculate frequency (contacts per minute)
    const recentContacts = eyeContactHistoryRef.current.filter(
      c => currentTime - c.timestamp < 60000
    );
    const frequency = recentContacts.length;

    // Assess quality based on duration patterns
    let quality: 'natural' | 'forced' | 'avoidant' = 'natural';
    if (duration > 10) quality = 'forced';
    else if (frequency < 2) quality = 'avoidant';

    // Assess gaze pattern
    const gazePattern = frequency > 8 ? 'wandering' : frequency < 2 ? 'distracted' : 'focused';

    if (isLookingAtCamera && !lastState.isLookingAtCamera) {
      eyeContactHistoryRef.current.push({
        timestamp: currentTime,
        duration: duration
      });
    }

    return {
      isLookingAtCamera,
      duration,
      frequency,
      quality,
      gazePattern
    };
  }, [enableEyeTracking, analysisState.current.eyeContact]);

  // Speech analysis
  const analyzeSpeech = useCallback((): LiveSpeechMetrics => {
    if (!analyserRef.current || !enableSpeechAnalysis) {
      return analysisState.current.speechMetrics;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate current volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const currentVolume = average / 255 * 100;

    // Determine if speech is active
    const isActive = currentVolume > 5; // Threshold for speech detection

    // Update audio levels buffer
    audioLevelsRef.current.push(currentVolume);
    if (audioLevelsRef.current.length > 100) {
      audioLevelsRef.current.shift();
    }

    // Calculate clarity based on frequency distribution
    const clarity = calculateAudioClarity(dataArray);

    // Estimate pace (simplified)
    const pace = estimateSpeechPace(audioLevelsRef.current);

    // Estimate enthusiasm based on volume variations
    const enthusiasm = calculateEnthusiasm(audioLevelsRef.current);

    // Estimate naturalness (simplified)
    const naturalness = calculateNaturalness(audioLevelsRef.current);

    return {
      isActive,
      currentVolume,
      clarity,
      pace,
      enthusiasm,
      naturalness
    };
  }, [enableSpeechAnalysis, analysisState.current.speechMetrics]);

  // Calculate engagement level
  const calculateEngagement = useCallback((
    emotion: EmotionState,
    eyeContact: EyeContactState,
    speech: LiveSpeechMetrics
  ): EngagementState => {
    const factors = [];
    let level = 50; // Base level

    // Emotional engagement
    if (emotion.valence > 0.3) {
      level += 20;
      factors.push('positive_emotion');
    }
    if (emotion.arousal > 0.6) {
      level += 15;
      factors.push('high_arousal');
    }

    // Eye contact engagement
    if (eyeContact.isLookingAtCamera) {
      level += 15;
      factors.push('eye_contact');
    }
    if (eyeContact.quality === 'natural') {
      level += 10;
      factors.push('natural_gaze');
    }

    // Speech engagement
    if (speech.isActive) {
      level += 20;
      factors.push('active_speech');
    }
    if (speech.enthusiasm > 70) {
      level += 15;
      factors.push('enthusiastic');
    }

    level = Math.max(0, Math.min(100, level));

    // Determine indicators
    const indicators = {
      attention: eyeContact.isLookingAtCamera && eyeContact.quality !== 'avoidant',
      participation: speech.isActive || speech.currentVolume > 10,
      curiosity: emotion.primary === 'focused' || emotion.primary === 'excited',
      enjoyment: emotion.valence > 0.4
    };

    // Calculate trend
    const recentEngagement = engagementHistoryRef.current.slice(-5);
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    
    if (recentEngagement.length >= 3) {
      const recent = recentEngagement.slice(-3).map(e => e.level);
      const isIncreasing = recent[2] > recent[1] && recent[1] > recent[0];
      const isDecreasing = recent[2] < recent[1] && recent[1] < recent[0];
      
      if (isIncreasing) trend = 'increasing';
      else if (isDecreasing) trend = 'decreasing';
    }

    // Update engagement history
    engagementHistoryRef.current.push({
      timestamp: Date.now(),
      level,
      factors
    });

    // Keep only recent history
    const fiveMinutesAgo = Date.now() - 300000;
    engagementHistoryRef.current = engagementHistoryRef.current.filter(
      e => e.timestamp > fiveMinutesAgo
    );

    return {
      level,
      indicators,
      trend
    };
  }, []);

  // Calculate comfort level
  const calculateComfort = useCallback((
    emotion: EmotionState,
    engagement: EngagementState,
    speech: LiveSpeechMetrics
  ): ComfortState => {
    let level = 70; // Start with moderate comfort

    // Emotional comfort indicators
    if (emotion.primary === 'sad' || emotion.primary === 'confused') {
      level -= 30;
    }
    if (emotion.valence < -0.5) {
      level -= 20;
    }
    if (emotion.stability > 0.7) {
      level += 10; // Stable emotions indicate comfort
    }

    // Engagement comfort indicators
    if (engagement.level < 30) {
      level -= 20; // Low engagement might indicate discomfort
    }
    if (engagement.trend === 'decreasing') {
      level -= 15;
    }

    // Speech comfort indicators
    if (speech.naturalness > 70) {
      level += 15;
    }
    if (speech.clarity < 30) {
      level -= 10; // Unclear speech might indicate nervousness
    }

    level = Math.max(0, Math.min(100, level));

    // Determine specific indicators
    const indicators = {
      relaxed: emotion.arousal < 0.6 && emotion.valence > 0,
      confident: speech.naturalness > 60 && speech.currentVolume > 20,
      overwhelmed: emotion.arousal > 0.8 && emotion.valence < 0,
      withdrawn: engagement.level < 30 && !speech.isActive
    };

    // Generate recommendation
    let recommendation: 'continue' | 'slow_down' | 'encourage' | 'break' = 'continue';
    
    if (indicators.overwhelmed) {
      recommendation = 'break';
    } else if (indicators.withdrawn || level < 40) {
      recommendation = 'encourage';
    } else if (engagement.trend === 'decreasing' && level < 60) {
      recommendation = 'slow_down';
    }

    return {
      level,
      indicators,
      recommendation
    };
  }, []);

  // Main analysis loop
  const performAnalysis = useCallback(() => {
    const emotion = analyzeFacialEmotion();
    const eyeContact = analyzeEyeContact();
    const speech = analyzeSpeech();
    const engagement = calculateEngagement(emotion, eyeContact, speech);
    const comfort = calculateComfort(emotion, engagement, speech);

    // Generate adaptive recommendations
    const recommendedAdjustments = [];
    
    if (comfort.level < 50) {
      recommendedAdjustments.push('reduce_complexity');
    }
    if (engagement.level < 40) {
      recommendedAdjustments.push('increase_enthusiasm');
    }
    if (emotion.valence < -0.3) {
      recommendedAdjustments.push('provide_encouragement');
    }

    const newState: RealTimeAnalysisState = {
      current: {
        facialEmotion: emotion,
        eyeContact,
        speechMetrics: speech,
        engagementLevel: engagement,
        comfortLevel: comfort
      },
      trends: {
        emotionHistory: emotionHistoryRef.current.slice(-50),
        engagementHistory: engagementHistoryRef.current.slice(-50),
        responseLatency: responseLatencyRef.current.slice(-20)
      },
      adaptiveState: {
        currentDifficulty: engagement.level > 70 ? 'hard' : engagement.level > 40 ? 'medium' : 'easy',
        supportLevel: comfort.level > 70 ? 'minimal' : comfort.level > 40 ? 'moderate' : 'high',
        recommendedAdjustments
      }
    };

    setAnalysisState(newState);
    onAnalysisUpdate(newState);
  }, [
    analyzeFacialEmotion,
    analyzeEyeContact,
    analyzeSpeech,
    calculateEngagement,
    calculateComfort,
    onAnalysisUpdate
  ]);

  // Start/stop analysis
  useEffect(() => {
    if (isActive) {
      initializeMediaStreams();
      analysisIntervalRef.current = setInterval(performAnalysis, analysisFrequency);
    } else {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    }

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isActive, initializeMediaStreams, performAnalysis, analysisFrequency]);

  return (
    <div className="hidden">
      {/* Hidden video element for analysis */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: 1, height: 1, opacity: 0 }}
      />
      {/* Hidden canvas for frame analysis */}
      <canvas
        ref={canvasRef}
        style={{ width: 1, height: 1, opacity: 0 }}
      />
    </div>
  );
}

// Helper functions
function calculateAudioClarity(frequencyData: Uint8Array): number {
  // Simplified clarity calculation based on frequency distribution
  const lowFreq = frequencyData.slice(0, 85).reduce((a, b) => a + b, 0);
  const midFreq = frequencyData.slice(85, 255).reduce((a, b) => a + b, 0);
  const highFreq = frequencyData.slice(255).reduce((a, b) => a + b, 0);
  
  const total = lowFreq + midFreq + highFreq;
  if (total === 0) return 0;
  
  // Good speech has balanced mid frequencies
  const midRatio = midFreq / total;
  return Math.min(100, midRatio * 150);
}

function estimateSpeechPace(audioLevels: number[]): number {
  if (audioLevels.length < 10) return 0;
  
  // Count speech activity bursts
  const threshold = 10;
  let bursts = 0;
  let inBurst = false;
  
  for (const level of audioLevels) {
    if (level > threshold && !inBurst) {
      bursts++;
      inBurst = true;
    } else if (level <= threshold) {
      inBurst = false;
    }
  }
  
  // Estimate words per minute (very rough)
  const timeSpan = audioLevels.length * 0.05; // Assuming 50ms intervals
  return (bursts / timeSpan) * 60 * 2; // Rough conversion to WPM
}

function calculateEnthusiasm(audioLevels: number[]): number {
  if (audioLevels.length < 5) return 50;
  
  const variance = calculateVariance(audioLevels);
  const average = audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length;
  
  // High variance and volume indicate enthusiasm
  return Math.min(100, (variance * 2) + (average * 1.5));
}

function calculateNaturalness(audioLevels: number[]): number {
  if (audioLevels.length < 10) return 50;
  
  // Natural speech has varied patterns, not monotone
  const variance = calculateVariance(audioLevels);
  const peaks = countPeaks(audioLevels);
  
  // Balance between variation (natural) and chaos (unnatural)
  const variationScore = Math.min(100, variance * 3);
  const rhythmScore = Math.min(100, peaks * 10);
  
  return (variationScore + rhythmScore) / 2;
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}

function countPeaks(numbers: number[]): number {
  let peaks = 0;
  for (let i = 1; i < numbers.length - 1; i++) {
    if (numbers[i] > numbers[i - 1] && numbers[i] > numbers[i + 1]) {
      peaks++;
    }
  }
  return peaks;
}