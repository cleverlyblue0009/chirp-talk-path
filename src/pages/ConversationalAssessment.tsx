import { useState, useCallback, useRef } from 'react';
import { ConversationalAssessmentEngine } from '@/components/assessment/ConversationalAssessmentEngine';
import { AssessmentReport } from '@/components/assessment/AssessmentReport';
import { ChildFriendlyErrorHandler, useChildFriendlyErrorHandler } from '@/components/assessment/ChildFriendlyErrorHandler';
import { ConversationalAssessmentScorer } from '@/utils/conversationalAssessmentScoring';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpCard } from '@/components/ChirpCard';
import { ChirpButton } from '@/components/ChirpButton';
import { 
  ConversationalAssessmentScore,
  PersonalizedGameConfig,
  RealTimeAnalysisState,
  DEFAULT_CONVERSATION_SEGMENTS,
  DEFAULT_BIRD_CHARACTERS
} from '@/types/conversational-assessment';
import { Play, ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type AssessmentPhase = 'setup' | 'assessment' | 'results' | 'error';

interface ConversationalAssessmentProps {
  childName?: string;
  onComplete?: (results: ConversationalAssessmentScore, gameConfig: PersonalizedGameConfig) => void;
  onStartGame?: (gameConfig: PersonalizedGameConfig) => void;
  onBack?: () => void;
  className?: string;
}

export function ConversationalAssessment({
  childName = "your child",
  onComplete,
  onStartGame,
  onBack,
  className
}: ConversationalAssessmentProps) {
  // Core state
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('setup');
  const [assessmentResults, setAssessmentResults] = useState<ConversationalAssessmentScore | null>(null);
  const [gameConfiguration, setGameConfiguration] = useState<PersonalizedGameConfig | null>(null);
  const [progress, setProgress] = useState(0);

  // Assessment data collection
  const conversationDataRef = useRef<{
    turns: any[];
    analysisHistory: RealTimeAnalysisState[];
    skillObservations: any[];
    adaptiveChanges: any[];
    sessionMetrics: {
      startTime: number;
      duration: number;
      totalInteractions: number;
      successfulExchanges: number;
      adaptationCount: number;
    };
  }>({
    turns: [],
    analysisHistory: [],
    skillObservations: [],
    adaptiveChanges: [],
    sessionMetrics: {
      startTime: Date.now(),
      duration: 0,
      totalInteractions: 0,
      successfulExchanges: 0,
      adaptationCount: 0
    }
  });

  const sessionStartTime = useRef<number>(Date.now());

  // Error handling
  const {
    setErrorHandler,
    reportError,
    reportCameraError,
    reportMicrophoneError,
    reportNetworkError
  } = useChildFriendlyErrorHandler();

  // Handle assessment completion
  const handleAssessmentComplete = useCallback(async (results: ConversationalAssessmentScore) => {
    try {
      // Calculate session duration
      const sessionDuration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
      conversationDataRef.current.sessionMetrics.duration = sessionDuration;

      // Generate more detailed scoring using the advanced scorer
      const scorer = new ConversationalAssessmentScorer(conversationDataRef.current);
      const enhancedResults = scorer.generateAssessmentScore();

      // Generate personalized game configuration
      const gameConfig = generatePersonalizedGameConfig(enhancedResults);

      setAssessmentResults(enhancedResults);
      setGameConfiguration(gameConfig);
      setCurrentPhase('results');

      // Notify parent component
      onComplete?.(enhancedResults, gameConfig);

    } catch (error) {
      console.error('Assessment completion failed:', error);
      reportError('analysis', 'Failed to complete assessment analysis');
      setCurrentPhase('error');
    }
  }, [onComplete, reportError]);

  // Generate personalized game configuration
  const generatePersonalizedGameConfig = (results: ConversationalAssessmentScore): PersonalizedGameConfig => {
    const { categoryScores, strengths, developmentAreas } = results;

    // Determine child's communication profile
    const childProfile = {
      communicationStrengths: strengths.map(s => s.strength),
      areasForGrowth: developmentAreas.map(d => d.area),
      preferredInteractionStyle: determineInteractionStyle(categoryScores) as 'verbal' | 'visual' | 'gestural' | 'mixed',
      comfortZones: identifyComfortZones(results),
      interestTopics: extractInterestTopics(conversationDataRef.current.turns),
      socialPreferences: determineSocialPreferences(categoryScores)
    };

    // Select appropriate bird companions
    const birdCompanions = selectBirdCompanions(childProfile, results);

    // Configure scenarios based on assessment
    const scenarioPreferences = generateScenarioPreferences(results);

    // Communication style configuration
    const communicationStyle = {
      preferredPace: categoryScores.verbalCommunication.score > 70 ? 'medium' : 'slow',
      processingTime: categoryScores.adaptability.score < 50 ? 8 : 5,
      feedbackStyle: categoryScores.emotionalRegulation.score > 70 ? 'immediate' : 'delayed',
      encouragementFrequency: categoryScores.socialEngagement.score < 50 ? 'high' : 'medium',
      visualSupports: categoryScores.nonVerbalCommunication.score > categoryScores.verbalCommunication.score
    } as const;

    // Difficulty progression
    const overallLevel = results.overallScore;
    const difficultyProgression = {
      startingLevel: overallLevel > 75 ? 'advanced' : overallLevel > 50 ? 'intermediate' : 'beginner',
      progressionRate: categoryScores.adaptability.score > 70 ? 'fast' : 'medium',
      adaptiveThresholds: {
        increaseThreshold: 80,
        decreaseThreshold: 40
      },
      skillFocus: developmentAreas.slice(0, 3).map(d => d.area)
    } as const;

    // Motivation factors
    const motivationFactors = identifyMotivationFactors(results, conversationDataRef.current);

    return {
      childProfile,
      birdCompanions,
      scenarioPreferences,
      communicationStyle,
      difficultyProgression,
      motivationFactors
    };
  };

  // Helper functions for game configuration
  const determineInteractionStyle = (categoryScores: any) => {
    const verbal = categoryScores.verbalCommunication.score;
    const nonverbal = categoryScores.nonVerbalCommunication.score;
    
    if (verbal > nonverbal + 20) return 'verbal';
    if (nonverbal > verbal + 20) return 'visual';
    return 'mixed';
  };

  const identifyComfortZones = (results: ConversationalAssessmentScore) => {
    const comfortZones = [];
    
    if (results.categoryScores.socialEngagement.score > 70) {
      comfortZones.push('group_activities');
    } else {
      comfortZones.push('one_on_one');
    }
    
    if (results.categoryScores.verbalCommunication.score > 70) {
      comfortZones.push('verbal_games');
    }
    
    if (results.categoryScores.nonVerbalCommunication.score > 70) {
      comfortZones.push('visual_activities');
    }
    
    return comfortZones;
  };

  const extractInterestTopics = (turns: any[]) => {
    // Simple keyword extraction from conversation
    const childTurns = turns.filter(turn => turn.speaker === 'child');
    const interests = [];
    
    const topicKeywords = {
      'animals': ['dog', 'cat', 'bird', 'pet', 'animal'],
      'games': ['play', 'game', 'fun', 'toy'],
      'family': ['mom', 'dad', 'sister', 'brother', 'family'],
      'school': ['school', 'teacher', 'friend', 'class'],
      'sports': ['ball', 'run', 'play', 'sport'],
      'art': ['draw', 'color', 'paint', 'picture']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const mentions = childTurns.some(turn => 
        keywords.some(keyword => 
          turn.content.toLowerCase().includes(keyword)
        )
      );
      if (mentions) interests.push(topic);
    });

    return interests.length > 0 ? interests : ['general_conversation'];
  };

  const determineSocialPreferences = (categoryScores: any) => {
    const socialScore = categoryScores.socialEngagement.score;
    if (socialScore > 75) return 'small_group';
    if (socialScore > 50) return 'one_on_one';
    return 'flexible';
  };

  const selectBirdCompanions = (profile: any, results: ConversationalAssessmentScore) => {
    const companions = [...DEFAULT_BIRD_CHARACTERS];
    
    // Always include Chirpy as main companion
    const selectedCompanions = [companions[0]]; // Chirpy
    
    // Add Buddy if social engagement is good
    if (results.categoryScores.socialEngagement.score > 60) {
      selectedCompanions.push(companions[1]); // Buddy
    }
    
    // Add wise bird if verbal communication is strong
    if (results.categoryScores.verbalCommunication.score > 70) {
      selectedCompanions.push(companions[2]); // Professor Hoot
    }
    
    return selectedCompanions;
  };

  const generateScenarioPreferences = (results: ConversationalAssessmentScore) => {
    const preferences = [
      {
        scenarioType: 'conversation_practice',
        preferenceLevel: results.categoryScores.verbalCommunication.score,
        reasonsForPreference: ['verbal_strength'],
        adaptations: []
      },
      {
        scenarioType: 'emotion_recognition',
        preferenceLevel: results.categoryScores.nonVerbalCommunication.score,
        reasonsForPreference: ['nonverbal_focus'],
        adaptations: []
      },
      {
        scenarioType: 'social_scenarios',
        preferenceLevel: results.categoryScores.socialEngagement.score,
        reasonsForPreference: ['social_practice'],
        adaptations: []
      }
    ];
    
    return preferences.sort((a, b) => b.preferenceLevel - a.preferenceLevel);
  };

  const identifyMotivationFactors = (results: ConversationalAssessmentScore, conversationData: any) => {
    const factors = [];
    
    // High engagement suggests intrinsic motivation
    if (results.categoryScores.socialEngagement.score > 70) {
      factors.push({
        factor: 'social_interaction',
        effectiveness: 85,
        examples: ['Talking with friends', 'Group activities'],
        whenToUse: ['social_scenarios', 'group_games']
      });
    }
    
    // Strong emotional regulation suggests self-motivation
    if (results.categoryScores.emotionalRegulation.score > 70) {
      factors.push({
        factor: 'achievement_recognition',
        effectiveness: 80,
        examples: ['Celebrating progress', 'Earning badges'],
        whenToUse: ['skill_milestones', 'completion_rewards']
      });
    }
    
    // Default motivators
    factors.push({
      factor: 'positive_feedback',
      effectiveness: 90,
      examples: ['Encouragement from birds', 'Success celebrations'],
      whenToUse: ['all_activities', 'difficult_tasks']
    });
    
    return factors;
  };

  // Handle progress updates
  const handleProgressUpdate = useCallback((newProgress: number) => {
    setProgress(newProgress);
  }, []);

  // Handle error recovery
  const handleErrorRetry = useCallback(() => {
    setCurrentPhase('setup');
    setProgress(0);
    sessionStartTime.current = Date.now();
    conversationDataRef.current = {
      turns: [],
      analysisHistory: [],
      skillObservations: [],
      adaptiveChanges: [],
      sessionMetrics: {
        startTime: Date.now(),
        duration: 0,
        totalInteractions: 0,
        successfulExchanges: 0,
        adaptationCount: 0
      }
    };
  }, []);

  const handleFallbackMode = useCallback((mode: string) => {
    console.log(`Activating fallback mode: ${mode}`);
    // Would implement specific fallback behaviors here
    setCurrentPhase('assessment');
  }, []);

  const handleContinueWithoutFeature = useCallback((feature: string) => {
    console.log(`Continuing without feature: ${feature}`);
    setCurrentPhase('assessment');
  }, []);

  // Handle starting the game
  const handleStartGame = useCallback(() => {
    if (gameConfiguration) {
      onStartGame?.(gameConfiguration);
    }
  }, [gameConfiguration, onStartGame]);

  // Handle report actions
  const handleDownloadReport = useCallback(() => {
    if (assessmentResults && gameConfiguration) {
      // Would implement PDF generation here
      console.log('Downloading report...');
    }
  }, [assessmentResults, gameConfiguration]);

  const handleShareReport = useCallback(() => {
    if (assessmentResults && gameConfiguration) {
      // Would implement sharing functionality here
      console.log('Sharing report...');
    }
  }, [assessmentResults, gameConfiguration]);

  // Render different phases
  return (
    <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {onBack && (
          <ChirpButton
            variant="secondary"
            icon={ArrowLeft}
            onClick={onBack}
          >
            Back
          </ChirpButton>
        )}
        
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-primary">
            Conversational Assessment
          </h1>
          <p className="text-muted-foreground">
            {currentPhase === 'setup' && "Let's get ready to meet your bird friends!"}
            {currentPhase === 'assessment' && `Having a conversation with ${childName}`}
            {currentPhase === 'results' && "Assessment complete! Here are the results."}
            {currentPhase === 'error' && "Oops! Let's try to fix this together."}
          </p>
        </div>
        
        <div className="w-24"> {/* Spacer for centering */}</div>
      </div>

      {/* Progress Bar */}
      {(currentPhase === 'assessment' || currentPhase === 'results') && (
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${currentPhase === 'results' ? 100 : progress}%` }}
          />
        </div>
      )}

      {/* Phase-specific content */}
      {currentPhase === 'setup' && (
        <div className="space-y-6">
          {/* Welcome */}
          <ChirpCard className="text-center space-y-4">
            <BirdMascot 
              size="large" 
              animation="bounce"
              showBubble
              speakMessage={true}
              message={`Hi ${childName}! Ready to chat?`}
              voiceSettings={{
                rate: 0.9,
                pitch: 1.1,
                volume: 0.8
              }}
            />
            
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-primary">
                Welcome to Your Conversation Adventure!
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                You're about to meet some friendly bird characters who love to chat! 
                This isn't a test - it's just a fun conversation where you can be yourself. 
                The birds will ask you questions, tell you stories, and play games with you.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🎤</div>
                  <h3 className="font-semibold">Just Talk Naturally</h3>
                  <p className="text-muted-foreground">Speak like you're talking to a friend</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">👀</div>
                  <h3 className="font-semibold">Look at the Birds</h3>
                  <p className="text-muted-foreground">They love making eye contact!</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl mb-2">😊</div>
                  <h3 className="font-semibold">Have Fun!</h3>
                  <p className="text-muted-foreground">There are no wrong answers</p>
                </div>
              </div>
            </div>
          </ChirpCard>

          {/* Privacy & Permissions */}
          <ChirpCard>
            <h3 className="text-lg font-bold mb-4">Before We Start</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <p>We'll need to use your camera and microphone to have our conversation</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <p>Everything is private and secure - only you and your family can see the results</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <p>You can stop anytime if you need a break</p>
              </div>
            </div>
          </ChirpCard>

          {/* Start Button */}
          <div className="text-center">
            <ChirpButton
              onClick={async () => {
                console.log('🚀 Starting conversational assessment...');
                
                // Request media permissions upfront
                try {
                  await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: { echoCancellation: true }
                  });
                  console.log('✅ Media permissions granted');
                } catch (error: any) {
                  console.warn('⚠️ Media permissions denied, but continuing with assessment:', error);
                  // Continue anyway - the system will use fallbacks
                }
                
                setCurrentPhase('assessment');
                sessionStartTime.current = Date.now();
              }}
              size="large"
              icon={Play}
              className="text-lg px-8 py-4"
            >
              Start Conversation!
            </ChirpButton>
          </div>
        </div>
      )}

      {currentPhase === 'assessment' && (
        <ConversationalAssessmentEngine
          onAssessmentComplete={handleAssessmentComplete}
          onProgressUpdate={handleProgressUpdate}
          segments={DEFAULT_CONVERSATION_SEGMENTS}
          birds={DEFAULT_BIRD_CHARACTERS}
        />
      )}

      {currentPhase === 'results' && assessmentResults && gameConfiguration && (
        <AssessmentReport
          assessmentResults={assessmentResults}
          gameConfiguration={gameConfiguration}
          sessionDuration={conversationDataRef.current.sessionMetrics.duration}
          childName={childName}
          onStartGame={handleStartGame}
          onDownloadReport={handleDownloadReport}
          onShareReport={handleShareReport}
        />
      )}

      {currentPhase === 'error' && (
        <ChildFriendlyErrorHandler
          onRetry={handleErrorRetry}
          onFallbackMode={handleFallbackMode}
          onContinueWithoutFeature={handleContinueWithoutFeature}
        />
      )}

      {/* Set up error handler */}
      {setErrorHandler(reportError)}
    </div>
  );
}