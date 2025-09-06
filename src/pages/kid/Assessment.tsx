import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { Progress } from '@/components/ui/progress';
import { SpeechRecorder } from '@/components/assessment/SpeechRecorder';
import { FacialRecognitionCamera } from '@/components/assessment/FacialRecognitionCamera';
import { PrivacyControls, PrivacySettings, PrivacyManager } from '@/components/assessment/PrivacyControls';
import { ErrorHandler, AssessmentError, AssessmentErrorHandler } from '@/components/assessment/ErrorHandler';
import { 
  AssessmentQuestion, 
  QuestionResponse, 
  AssessmentResults,
  ASSESSMENT_QUESTIONS,
  SpeechAnalysisResult,
  FacialAnalysisResult
} from '@/types/assessment';
import { AssessmentScorer } from '@/utils/assessmentScoring';
import { Mic, MicOff, Camera, CameraOff, ArrowLeft, CheckCircle, Settings, Shield } from 'lucide-react';

// Types are now imported from @/types/assessment

export default function Assessment() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<Partial<QuestionResponse>>({});
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(PrivacyManager.getSettings());
  const [currentError, setCurrentError] = useState<AssessmentError | null>(null);
  const responseStartTime = useRef<number>(Date.now());

  useEffect(() => {
    // Check browser support on component mount
    const browserError = AssessmentErrorHandler.checkBrowserSupport();
    if (browserError) {
      setCurrentError(browserError);
      AssessmentErrorHandler.logError(browserError, 'Browser compatibility check');
    }

    // Schedule data deletion based on privacy settings
    PrivacyManager.scheduleDataDeletion();
    
    // Check for expired data
    PrivacyManager.checkAndDeleteExpiredData();
  }, []);

  const questions = ASSESSMENT_QUESTIONS;

  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const currentQ = questions[currentQuestion];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    const response: QuestionResponse = {
      questionId: currentQ.id,
      selectedAnswer: answerIndex,
      responseTime: Date.now() - responseStartTime.current,
      attempts: 1,
      confidence: answerIndex === currentQ.correctAnswer ? 90 : 60
    };
    
    const newResponses = [...responses];
    newResponses[currentQuestion] = response;
    setResponses(newResponses);

    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsRecording(false);
      setShowFeedback(false);
      setCurrentResponse({});
      responseStartTime.current = Date.now();
    } else {
      // Assessment complete
      completeAssessment();
    }
  };

  const completeAssessment = async () => {
    setIsProcessing(true);
    
    try {
      // Calculate comprehensive assessment results
      const results = AssessmentScorer.calculateResults('demo-user', responses);
      
      // Apply privacy settings to results
      const privacyFilteredResults = {
        ...results,
        // Remove sensitive data if privacy settings require it
        detailedMetrics: privacySettings.dataMinimization ? {
          ...results.detailedMetrics,
          speechClarity: 0,
          eyeContactDuration: 0,
          responseTime: 0
        } : results.detailedMetrics
      };
      
      // Store results in localStorage (respecting privacy settings)
      if (privacySettings.saveRecordings || privacySettings.allowDataAnalysis) {
        localStorage.setItem('chirp_assessment_results', JSON.stringify(privacyFilteredResults));
      } else {
        // Store minimal results only
        const minimalResults = {
          recommendedLevel: results.recommendedLevel,
          overallScore: results.overallScore,
          timestamp: results.timestamp
        };
        localStorage.setItem('chirp_assessment_results', JSON.stringify(minimalResults));
      }
      
      // Navigate to results page
      navigate(`/kid/assessment-result?level=${results.recommendedLevel}&score=${results.overallScore}`);
    } catch (error: any) {
      console.error('Assessment completion failed:', error);
      const assessmentError = AssessmentErrorHandler.createAnalysisError(error.message);
      handleError(assessmentError);
      
      // Don't navigate on error - let user retry or skip
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeechRecordingComplete = (audioBlob: Blob, analysis: SpeechAnalysisResult) => {
    try {
      const response: QuestionResponse = {
        questionId: currentQ.id,
        spokenResponse: analysis.transcription,
        audioBlob: privacySettings.saveRecordings ? audioBlob : undefined,
        responseTime: Date.now() - responseStartTime.current,
        attempts: 1,
        confidence: analysis.confidence,
        analysisData: {
          speechAnalysis: privacySettings.allowDataAnalysis ? analysis : {
            transcription: analysis.transcription,
            clarity: 0,
            volume: 0,
            pace: 0,
            keywordsFound: [],
            sentimentScore: 0,
            confidence: analysis.confidence
          }
        }
      };
      
      const newResponses = [...responses];
      newResponses[currentQuestion] = response;
      setResponses(newResponses);
      
      setShowFeedback(true);
      setTimeout(() => {
        nextQuestion();
      }, 3000);
    } catch (error: any) {
      const assessmentError = AssessmentErrorHandler.createAnalysisError(error.message);
      handleError(assessmentError);
    }
  };

  const handleFacialAnalysisComplete = (videoBlob: Blob, analysis: FacialAnalysisResult) => {
    try {
      const response: QuestionResponse = {
        questionId: currentQ.id,
        videoBlob: privacySettings.saveRecordings ? videoBlob : undefined,
        responseTime: Date.now() - responseStartTime.current,
        attempts: 1,
        confidence: analysis.overallEngagement,
        analysisData: {
          facialAnalysis: privacySettings.allowDataAnalysis ? analysis : {
            eyeContact: { duration: 0, frequency: 0, quality: 0 },
            expressions: [],
            headPose: { yaw: 0, pitch: 0, roll: 0 },
            overallEngagement: analysis.overallEngagement
          }
        }
      };
      
      const newResponses = [...responses];
      newResponses[currentQuestion] = response;
      setResponses(newResponses);
      
      setShowFeedback(true);
      setTimeout(() => {
        nextQuestion();
      }, 3000);
    } catch (error: any) {
      const assessmentError = AssessmentErrorHandler.createAnalysisError(error.message);
      handleError(assessmentError);
    }
  };

  const requestPermissions = async () => {
    try {
      // Check what permissions we actually need based on questions
      const needsCamera = questions.some(q => q.requiresCamera);
      const needsMicrophone = questions.some(q => q.requiresMicrophone);
      
      const constraints: MediaStreamConstraints = {};
      
      if (needsMicrophone) {
        constraints.audio = {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        };
      }
      
      if (needsCamera) {
        constraints.video = {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        };
      }
      
      if (constraints.audio || constraints.video) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Stop the stream immediately - we just wanted to check permissions
        stream.getTracks().forEach(track => track.stop());
      }
      
      setPermissionsGranted(true);
      setCurrentError(null);
    } catch (error: any) {
      console.error('Permission denied:', error);
      const assessmentError = AssessmentErrorHandler.handleMediaError(error);
      setCurrentError(assessmentError);
      AssessmentErrorHandler.logError(assessmentError, 'Permission request');
      
      // Don't block the assessment - user can skip media questions
      setPermissionsGranted(true);
    }
  };

  const handlePrivacySettingsChange = (newSettings: PrivacySettings) => {
    setPrivacySettings(newSettings);
    PrivacyManager.saveSettings(newSettings);
    
    if (newSettings.autoDeleteAfter > 0) {
      PrivacyManager.scheduleDataDeletion();
    }
  };

  const handleError = (error: AssessmentError) => {
    setCurrentError(error);
    AssessmentErrorHandler.logError(error, `Question ${currentQuestion + 1}`);
  };

  const handleErrorRetry = () => {
    setCurrentError(null);
    // Retry the current question/action
  };

  const handleErrorSkip = () => {
    setCurrentError(null);
    // Skip current question and move to next
    nextQuestion();
  };

  const handleErrorGoHome = () => {
    setCurrentError(null);
    navigate('/kid/home');
  };

  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <ChirpCard className="text-center animate-scale-in">
            <div className="mb-6">
              <BirdMascot 
                size="large" 
                animation="bounce"
                className="mx-auto mb-4"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-card-foreground mb-4">
              Let's Learn Together! 🎮
            </h1>
            
            <div className="space-y-4 text-left mb-6">
              <p className="text-sm text-muted-foreground">
                Hi! I'm Chirpy, and I want to be your conversation buddy.
              </p>
              <p className="text-sm text-muted-foreground">
                I'll ask you some fun questions to learn how you like to communicate!
              </p>
              <p className="text-sm text-muted-foreground">
                We might use your camera and microphone to practice together. There are no wrong answers - just be yourself! 😊
              </p>
              <div className="bg-secondary/20 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">🔒 Privacy Note:</p>
                <p>Your recordings help me understand you better and are kept safe and private.</p>
              </div>
            </div>

            <div className="space-y-3">
              <ChirpButton 
                variant="primary" 
                onClick={async () => {
                  await requestPermissions();
                  setShowIntro(false);
                  responseStartTime.current = Date.now();
                }}
                className="w-full animate-bounce-gentle"
              >
                Let's Start! 🚀
              </ChirpButton>
              
              <ChirpButton 
                variant="secondary" 
                icon={Shield}
                onClick={() => setShowPrivacySettings(true)}
                className="w-full"
              >
                Privacy Settings
              </ChirpButton>
              
              <ChirpButton 
                variant="secondary" 
                onClick={() => navigate('/kid/home')}
                className="w-full"
              >
                Maybe Later
              </ChirpButton>
            </div>
          </ChirpCard>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <ChirpCard className="text-center animate-scale-in">
            <div className="mb-6">
              <BirdMascot 
                size="large" 
                animation="sparkle"
                className="mx-auto mb-4"
              />
            </div>
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              Analyzing Your Responses... 🧠
            </h2>
            <div className="space-y-2">
              <div className="animate-pulse bg-primary/20 h-2 rounded-full"></div>
              <p className="text-sm text-muted-foreground">
                Chirpy is learning about your communication style!
              </p>
            </div>
          </ChirpCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4">
      <div className="max-w-md mx-auto">
        {/* Progress Header */}
        <div className="mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <ChirpButton 
              variant="secondary" 
              size="small" 
              icon={ArrowLeft}
              onClick={() => navigate('/kid/home')}
            >
              Back
            </ChirpButton>
            <div className="text-center">
              <h2 className="font-bold text-lg text-card-foreground">Communication Assessment</h2>
              <span className="text-sm text-muted-foreground">
                {currentQuestion + 1} of {totalQuestions}
              </span>
            </div>
            <ChirpButton 
              variant="secondary" 
              size="small" 
              icon={Settings}
              onClick={() => setShowPrivacySettings(true)}
            />
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Section */}
        <ChirpCard className="mb-6 animate-slide-up">
          <div className="text-center">
            <div className="mb-4">
              <BirdMascot 
                size="large" 
                animation={showFeedback ? 'sparkle' : 'wiggle'}
                className="mx-auto mb-4"
                showBubble
                message={showFeedback ? 'Great job!' : 'You\'re doing amazing!'}
              />
            </div>
            
            <div className="bg-secondary/20 rounded-2xl p-4">
              <div className="flex items-center justify-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  currentQ.category === 'verbal' ? 'bg-blue-400' :
                  currentQ.category === 'nonverbal' ? 'bg-green-400' :
                  currentQ.category === 'social' ? 'bg-purple-400' : 'bg-orange-400'
                }`}></div>
                <h3 className="font-semibold text-secondary-foreground text-sm capitalize">
                  {currentQ.category === 'nonverbal' ? 'Non-verbal' : currentQ.category} Communication
                </h3>
              </div>
              <p className="text-lg text-card-foreground mb-3">{currentQ.question}</p>
              {currentQ.instruction && (
                <p className="text-sm text-muted-foreground italic">{currentQ.instruction}</p>
              )}
            </div>
          </div>
        </ChirpCard>

        {/* Answer Section */}
        {currentQ.type === 'mcq' || currentQ.type === 'scenario' ? (
          <div className="space-y-3 mb-6 animate-slide-up">
            {currentQ.options?.map((option, index) => (
              <ChirpCard
                key={index}
                variant="interactive"
                onClick={() => handleAnswerSelect(index)}
                disabled={showFeedback}
                className={`
                  transition-all duration-300
                  ${showFeedback && selectedAnswer === index 
                    ? (index === currentQ.correctAnswer || currentQ.correctAnswer === -1
                      ? 'ring-2 ring-primary shadow-glow bg-primary/10' 
                      : 'ring-2 ring-destructive/50 bg-destructive/10')
                    : selectedAnswer === index ? 'ring-2 ring-primary shadow-glow bg-primary/10' : ''
                  }
                  ${showFeedback && index === currentQ.correctAnswer && selectedAnswer !== index && currentQ.correctAnswer !== -1
                    ? 'ring-2 ring-primary/50 bg-primary/5'
                    : ''
                  }
                `}
              >
                <div className="flex items-center">
                  {showFeedback && (
                    <div className="mr-3">
                      {(index === currentQ.correctAnswer || currentQ.correctAnswer === -1) && selectedAnswer === index ? (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      ) : selectedAnswer === index ? (
                        <div className="w-5 h-5 rounded-full border-2 border-destructive" />
                      ) : index === currentQ.correctAnswer && currentQ.correctAnswer !== -1 ? (
                        <CheckCircle className="w-5 h-5 text-primary/50" />
                      ) : null}
                    </div>
                  )}
                  <p className="text-center font-medium text-card-foreground flex-1">{option}</p>
                </div>
              </ChirpCard>
            ))}
          </div>
        ) : currentQ.type === 'speech' ? (
          <div className="space-y-4 mb-6 animate-slide-up">
            <SpeechRecorder
              onRecordingComplete={handleSpeechRecordingComplete}
              maxDuration={currentQ.timeLimit || 30}
              expectedKeywords={currentQ.expectedKeywords}
              disabled={showFeedback}
            />
            <ChirpButton
              variant="secondary"
              onClick={nextQuestion}
              className="w-full"
              disabled={showFeedback}
            >
              Skip This Question
            </ChirpButton>
          </div>
        ) : currentQ.type === 'facial' || currentQ.type === 'gesture' ? (
          <div className="space-y-4 mb-6 animate-slide-up">
            <FacialRecognitionCamera
              onAnalysisComplete={handleFacialAnalysisComplete}
              maxDuration={currentQ.timeLimit || 15}
              disabled={showFeedback}
              showPreview={true}
            />
            <ChirpButton
              variant="secondary"
              onClick={nextQuestion}
              className="w-full"
              disabled={showFeedback}
            >
              Skip This Question
            </ChirpButton>
          </div>
        ) : null}

        {/* Feedback and Encouragement */}
        {showFeedback && currentQ.type !== 'speech' && currentQ.type !== 'facial' && currentQ.type !== 'gesture' ? (
          <ChirpCard className="mb-6 animate-slide-up">
            <div className="text-center">
              {(selectedAnswer === currentQ.correctAnswer || currentQ.correctAnswer === -1) ? (
                <div>
                  <div className="text-2xl mb-2">🎉</div>
                  <h3 className="font-bold text-primary mb-2">
                    {currentQ.correctAnswer === -1 ? 'Thank you for sharing!' : 'Excellent choice!'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {currentQ.correctAnswer === -1 
                      ? 'Every answer helps me understand you better!' 
                      : 'That shows great communication skills!'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">🤔</div>
                  <h3 className="font-bold text-secondary mb-2">Let's learn together!</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    That's okay! A great choice would be: "{currentQ.options?.[currentQ.correctAnswer || 0]}"
                  </p>
                </div>
              )}
            </div>
          </ChirpCard>
        ) : null}

        {/* Encouragement */}
        <ChirpCard className="text-center animate-slide-up">
          <p className="text-sm text-muted-foreground">
            {currentQuestion < 3 
              ? "Great start! You're doing wonderfully! 🌟" 
              : currentQuestion < 8 
              ? "You're doing amazing! Keep it up! 🎉"
              : "Almost done - you're doing fantastic! 🚀"
            }
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            Progress: {responses.filter(r => r).length} of {totalQuestions} questions completed
          </div>
        </ChirpCard>
      </div>
      
      {/* Privacy Settings Modal */}
      {showPrivacySettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <PrivacyControls
              onPrivacySettingsChange={handlePrivacySettingsChange}
            />
            <div className="mt-4 text-center">
              <ChirpButton
                variant="primary"
                onClick={() => setShowPrivacySettings(false)}
              >
                Done
              </ChirpButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Handler */}
      <ErrorHandler
        error={currentError}
        onRetry={handleErrorRetry}
        onSkip={handleErrorSkip}
        onGoHome={handleErrorGoHome}
      />
    </div>
  );
}