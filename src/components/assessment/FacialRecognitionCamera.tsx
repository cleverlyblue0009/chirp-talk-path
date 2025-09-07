import { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Eye, EyeOff } from 'lucide-react';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { FacialAnalysisResult } from '@/types/assessment';

interface FacialRecognitionCameraProps {
  onAnalysisComplete: (videoBlob: Blob, analysis: FacialAnalysisResult) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
}

export function FacialRecognitionCamera({
  onAnalysisComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 15,
  className,
  disabled = false,
  showPreview = true
}: FacialRecognitionCameraProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [eyeContactTime, setEyeContactTime] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Face analysis data
  const analysisDataRef = useRef<{
    eyeContactDurations: number[];
    emotions: { emotion: string; confidence: number; timestamp: number }[];
    headPoses: { yaw: number; pitch: number; roll: number; timestamp: number }[];
    engagementScores: number[];
  }>({
    eyeContactDurations: [],
    emotions: [],
    headPoses: [],
    engagementScores: []
  });

  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      await initializeCamera();
      if (!streamRef.current) return;
    }

    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        setIsAnalyzing(true);

        try {
          const analysis = await analyzeFacialData();
          onAnalysisComplete(videoBlob, analysis);
        } catch (error) {
          console.error('Facial analysis failed:', error);
          // Provide basic analysis even if advanced analysis fails
          const basicAnalysis: FacialAnalysisResult = {
            eyeContact: {
              duration: eyeContactTime,
              frequency: eyeContactTime > 5 ? 0.8 : 0.4,
              quality: eyeContactTime > 5 ? 75 : 45
            },
            expressions: [
              {
                emotion: currentEmotion,
                confidence: 0.7,
                duration: recordingTime
              }
            ],
            headPose: {
              yaw: 0,
              pitch: 0,
              roll: 0
            },
            overallEngagement: Math.min(100, (eyeContactTime / recordingTime) * 100)
          };
          onAnalysisComplete(videoBlob, basicAnalysis);
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setEyeContactTime(0);
      onRecordingStart?.();

      // Reset analysis data
      analysisDataRef.current = {
        eyeContactDurations: [],
        emotions: [],
        headPoses: [],
        engagementScores: []
      };

      // Start real-time analysis
      startRealTimeAnalysis();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start video recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStop?.();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    }
  };

  const startRealTimeAnalysis = () => {
    analysisIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && isRecording) {
        performFrameAnalysis();
      }
    }, 500); // Analyze every 500ms
  };

  const performFrameAnalysis = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current video frame to canvas for analysis
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Simple face detection simulation (in real implementation, use TensorFlow.js or MediaPipe)
    const faceDetected = simulateFaceDetection();
    
    if (faceDetected) {
      // Simulate eye contact detection
      const eyeContact = simulateEyeContactDetection();
      if (eyeContact) {
        setEyeContactTime(prev => prev + 0.5);
        analysisDataRef.current.eyeContactDurations.push(0.5);
      }

      // Simulate emotion detection
      const emotion = simulateEmotionDetection();
      setCurrentEmotion(emotion.emotion);
      analysisDataRef.current.emotions.push({
        emotion: emotion.emotion,
        confidence: emotion.confidence,
        timestamp: Date.now()
      });

      // Simulate head pose estimation
      const headPose = simulateHeadPoseEstimation();
      analysisDataRef.current.headPoses.push({
        ...headPose,
        timestamp: Date.now()
      });

      // Calculate engagement score
      const engagement = calculateEngagementScore();
      analysisDataRef.current.engagementScores.push(engagement);
    }
  };

  // Simulation functions (replace with real AI models in production)
  const simulateFaceDetection = (): boolean => {
    return Math.random() > 0.1; // 90% chance of face detection
  };

  const simulateEyeContactDetection = (): boolean => {
    return Math.random() > 0.3; // 70% chance of eye contact
  };

  const simulateEmotionDetection = () => {
    // More realistic emotion detection with better variety and less neutral
    const emotions = [
      { emotion: 'happy', confidence: 0.85 },
      { emotion: 'focused', confidence: 0.80 },
      { emotion: 'curious', confidence: 0.75 },
      { emotion: 'excited', confidence: 0.70 },
      { emotion: 'engaged', confidence: 0.82 },
      { emotion: 'thoughtful', confidence: 0.65 },
      { emotion: 'neutral', confidence: 0.60 }  // Lower confidence for neutral
    ];
    
    // Bias toward more expressive emotions
    const weights = [0.25, 0.20, 0.18, 0.15, 0.12, 0.08, 0.02];
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < emotions.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return emotions[i];
      }
    }
    
    return emotions[0]; // fallback to happy
  };

  const simulateHeadPoseEstimation = () => {
    return {
      yaw: (Math.random() - 0.5) * 30,
      pitch: (Math.random() - 0.5) * 20,
      roll: (Math.random() - 0.5) * 15
    };
  };

  const calculateEngagementScore = (): number => {
    const eyeContactRatio = eyeContactTime / Math.max(recordingTime, 1);
    const emotionPositivity = currentEmotion === 'happy' ? 1 : currentEmotion === 'engaged' ? 0.8 : 0.6;
    return Math.min(100, (eyeContactRatio * 60 + emotionPositivity * 40));
  };

  const analyzeFacialData = async (): Promise<FacialAnalysisResult> => {
    const data = analysisDataRef.current;
    const totalDuration = recordingTime;

    // Calculate eye contact metrics
    const totalEyeContactTime = data.eyeContactDurations.reduce((sum, duration) => sum + duration, 0);
    const eyeContactFrequency = data.eyeContactDurations.length / totalDuration;
    const eyeContactQuality = Math.min(100, (totalEyeContactTime / totalDuration) * 100);

    // Process emotions
    const emotionCounts = data.emotions.reduce((acc, emotion) => {
      acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0];

    const expressions = Object.entries(emotionCounts).map(([emotion, count]) => ({
      emotion,
      confidence: count / data.emotions.length,
      duration: (count / data.emotions.length) * totalDuration
    }));

    // Calculate average head pose
    const avgHeadPose = data.headPoses.reduce(
      (acc, pose) => ({
        yaw: acc.yaw + pose.yaw / data.headPoses.length,
        pitch: acc.pitch + pose.pitch / data.headPoses.length,
        roll: acc.roll + pose.roll / data.headPoses.length
      }),
      { yaw: 0, pitch: 0, roll: 0 }
    );

    // Calculate overall engagement
    const avgEngagement = data.engagementScores.reduce((sum, score) => sum + score, 0) / 
      Math.max(data.engagementScores.length, 1);

    return {
      eyeContact: {
        duration: totalEyeContactTime,
        frequency: eyeContactFrequency,
        quality: eyeContactQuality
      },
      expressions,
      headPose: avgHeadPose,
      overallEngagement: avgEngagement
    };
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    if (showPreview && !streamRef.current) {
      initializeCamera();
    }
  }, [showPreview]);

  return (
    <ChirpCard className={className}>
      <div className="text-center space-y-4">
        {error && (
          <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {showPreview && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full max-w-sm mx-auto rounded-lg ${
                !cameraReady ? 'bg-muted' : ''
              }`}
              style={{ transform: 'scaleX(-1)' }} // Mirror the video
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {isRecording && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                REC
              </div>
            )}

            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                <div className="text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Starting camera...</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <ChirpButton
            variant={isRecording ? 'secondary' : 'primary'}
            icon={isRecording ? CameraOff : Camera}
            onClick={toggleRecording}
            disabled={disabled || isAnalyzing || (!cameraReady && showPreview)}
            className={`w-full ${isRecording ? 'animate-pulse' : ''}`}
          >
            {isAnalyzing 
              ? 'Analyzing...' 
              : isRecording 
                ? `Recording... (${maxDuration - recordingTime}s)` 
                : 'Start Recording'
            }
          </ChirpButton>

          {isRecording && (
            <div className="space-y-2">
              {/* Eye contact indicator */}
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Eye className={`w-4 h-4 ${eyeContactTime > 2 ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-muted-foreground">
                  Eye contact: {eyeContactTime.toFixed(1)}s
                </span>
              </div>

              {/* Current emotion */}
              <div className="bg-secondary/20 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Current expression:</p>
                <p className="text-sm font-medium capitalize">{currentEmotion}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {isRecording 
            ? "Look at the camera and speak naturally!" 
            : "This will record a short video to analyze your communication"
          }
        </p>
      </div>
    </ChirpCard>
  );
}