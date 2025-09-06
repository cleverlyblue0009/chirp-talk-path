import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { SpeechAnalysisResult } from '@/types/assessment';

interface SpeechRecorderProps {
  onRecordingComplete: (audioBlob: Blob, analysis: SpeechAnalysisResult) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  maxDuration?: number; // in seconds
  expectedKeywords?: string[];
  className?: string;
  disabled?: boolean;
}

export function SpeechRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 30,
  expectedKeywords = [],
  className,
  disabled = false
}: SpeechRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setTranscription(finalTranscript || interimTranscript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setError('Speech recognition failed. You can still continue!');
        };
      }
    }

    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const analyzeAudioLevel = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    setAudioLevel(average / 255 * 100);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsAnalyzing(true);

        try {
          const analysis = await analyzeSpeech(audioBlob, transcription);
          onRecordingComplete(audioBlob, analysis);
        } catch (error) {
          console.error('Speech analysis failed:', error);
          // Provide basic analysis even if advanced analysis fails
          const basicAnalysis: SpeechAnalysisResult = {
            transcription: transcription || '',
            clarity: 75, // Default reasonable score
            volume: audioLevel,
            pace: estimatePace(transcription),
            keywordsFound: findKeywords(transcription, expectedKeywords),
            sentimentScore: 0.5,
            confidence: transcription ? 80 : 30
          };
          onRecordingComplete(audioBlob, basicAnalysis);
        } finally {
          setIsAnalyzing(false);
        }

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      // Start recording
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStart?.();

      // Start speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('Speech recognition already started or not available');
        }
      }

      // Start audio level monitoring
      analyzeAudioLevel();

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
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingStop?.();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Speech recognition stop error:', error);
        }
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const analyzeSpeech = async (audioBlob: Blob, transcript: string): Promise<SpeechAnalysisResult> => {
    // Basic analysis - in a real implementation, this would use more sophisticated AI
    const wordsCount = transcript.trim().split(/\s+/).length;
    const duration = recordingTime || 1;
    const pace = (wordsCount / duration) * 60; // words per minute

    const keywordsFound = findKeywords(transcript, expectedKeywords);
    const clarity = calculateClarity(transcript, audioLevel);
    const sentimentScore = analyzeSentiment(transcript);

    return {
      transcription: transcript,
      clarity,
      volume: audioLevel,
      pace,
      keywordsFound,
      sentimentScore,
      confidence: transcript ? Math.min(95, 60 + keywordsFound.length * 10) : 30
    };
  };

  const findKeywords = (text: string, keywords: string[]): string[] => {
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  };

  const calculateClarity = (transcript: string, volume: number): number => {
    if (!transcript.trim()) return 20;
    
    const wordCount = transcript.trim().split(/\s+/).length;
    const volumeScore = Math.min(100, volume * 2);
    const lengthScore = Math.min(100, wordCount * 20);
    
    return Math.round((volumeScore + lengthScore) / 2);
  };

  const analyzeSentiment = (text: string): number => {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'happy', 'love', 'like', 'fun', 'awesome', 'nice'];
    const negativeWords = ['bad', 'sad', 'hate', 'angry', 'terrible', 'awful'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 0.7;
    if (negativeCount > positiveCount) return 0.3;
    return 0.5;
  };

  const estimatePace = (text: string): number => {
    const words = text.trim().split(/\s+/).length;
    const duration = recordingTime || 1;
    return (words / duration) * 60;
  };

  return (
    <ChirpCard className={className}>
      <div className="text-center space-y-4">
        {error && (
          <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <ChirpButton
            variant={isRecording ? 'secondary' : 'primary'}
            icon={isRecording ? MicOff : Mic}
            onClick={toggleRecording}
            disabled={disabled || isAnalyzing}
            className={`w-full ${isRecording ? 'animate-pulse' : ''}`}
          >
            {isAnalyzing 
              ? 'Analyzing...' 
              : isRecording 
                ? `Recording... (${maxDuration - recordingTime}s)` 
                : 'Start Speaking'
            }
          </ChirpButton>

          {isRecording && (
            <div className="space-y-2">
              {/* Audio level indicator */}
              <div className="flex justify-center items-center space-x-2">
                <VolumeX className="w-4 h-4 text-muted-foreground" />
                <div className="flex space-x-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-4 rounded-full transition-colors ${
                        audioLevel > (i * 10) 
                          ? 'bg-primary' 
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Live transcription */}
              {transcription && (
                <div className="bg-secondary/20 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground mb-1">I hear:</p>
                  <p className="text-sm font-medium">{transcription}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {isRecording 
            ? "Speak clearly and take your time!" 
            : "Tap the button and speak your answer"
          }
        </p>
      </div>
    </ChirpCard>
  );
}