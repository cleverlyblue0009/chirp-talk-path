import { useState, useEffect, useRef, useCallback } from 'react';
import { RealTimeAnalysisEngine } from './RealTimeAnalysisEngine';
import { RiveBirdCharacter, useBirdCharacters } from './RiveBirdCharacter';
import { SpeechRecorder } from './SpeechRecorder';
import { LiveAnalysisDisplay } from './LiveAnalysisDisplay';
import { 
  ConversationSegment, 
  BirdCharacter, 
  RealTimeAnalysisState,
  ConversationFlow,
  BirdConversationState,
  ConversationTurn,
  DEFAULT_CONVERSATION_SEGMENTS,
  DEFAULT_BIRD_CHARACTERS,
  ConversationalAssessmentScore
} from '@/types/conversational-assessment';
import { ChirpCard } from '@/components/ChirpCard';
import { ChirpButton } from '@/components/ChirpButton';
import { cn } from '@/lib/utils';

interface ConversationalAssessmentEngineProps {
  onAssessmentComplete: (results: ConversationalAssessmentScore) => void;
  onProgressUpdate?: (progress: number) => void;
  segments?: ConversationSegment[];
  birds?: BirdCharacter[];
  className?: string;
}

export function ConversationalAssessmentEngine({
  onAssessmentComplete,
  onProgressUpdate,
  segments = DEFAULT_CONVERSATION_SEGMENTS,
  birds = DEFAULT_BIRD_CHARACTERS,
  className
}: ConversationalAssessmentEngineProps) {
  // Core state
  const [isActive, setIsActive] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [conversationFlow, setConversationFlow] = useState<ConversationFlow>({
    currentSegment: segments[0]?.id || '',
    completedSegments: [],
    upcomingSegments: segments.slice(1).map(s => s.id),
    adaptations: [],
    sessionMetrics: {
      startTime: Date.now(),
      duration: 0,
      totalInteractions: 0,
      successfulExchanges: 0,
      adaptationCount: 0,
      overallEngagement: 0,
      skillDemonstrations: []
    }
  });

  // Analysis state
  const [analysisState, setAnalysisState] = useState<RealTimeAnalysisState | null>(null);
  const [birdConversationState, setBirdConversationState] = useState<BirdConversationState>({
    activeBirds: birds,
    currentSpeaker: 'chirpy',
    conversationMode: 'introduction',
    turnHistory: [],
    dynamicResponses: []
  });

  // Conversation management
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [childResponse, setChildResponse] = useState<string>('');
  const [conversationScript, setConversationScript] = useState<Array<{
    speaker: string;
    text: string;
    mood?: string;
    waitForResponse?: boolean;
    analysisObjectives?: string[];
  }>>([]);

  // Refs
  const sessionStartTime = useRef<number>(Date.now());
  const responseStartTime = useRef<number>(0);
  const conversationDataRef = useRef<{
    turns: ConversationTurn[];
    skillObservations: Array<{skill: string, evidence: string[], timestamp: number}>;
    adaptiveChanges: Array<{trigger: string, change: string, timestamp: number}>;
  }>({
    turns: [],
    skillObservations: [],
    adaptiveChanges: []
  });

  // Bird character management
  const { activeBird, registerBird, speakAsBird, triggerBirdAnimation, setBirdMood } = useBirdCharacters(birds);

  // Enhanced TTS with child-friendly voices
  const speakAsBirdWithTTS = useCallback(async (birdId: string, text: string) => {
    const bird = birds.find(b => b.id === birdId);
    if (!bird) return;

    return new Promise<void>((resolve) => {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice for child-friendly, non-robotic speech
      const voices = speechSynthesis.getVoices();
      let selectedVoice = null;

      // Prefer high-quality voices for different birds
      if (birdId === 'chirpy') {
        selectedVoice = voices.find(voice => 
          voice.name.includes('Samantha') || // macOS
          voice.name.includes('Microsoft Zira') || // Windows
          voice.name.includes('Google UK English Female') || // Chrome
          voice.lang.startsWith('en') && voice.name.includes('Female')
        );
      } else if (birdId === 'buddy') {
        selectedVoice = voices.find(voice => 
          voice.name.includes('Alex') || // macOS
          voice.name.includes('Microsoft David') || // Windows
          voice.name.includes('Google UK English Male') || // Chrome
          voice.lang.startsWith('en') && voice.name.includes('Male')
        );
      } else if (birdId === 'wise') {
        selectedVoice = voices.find(voice => 
          voice.name.includes('Victoria') || // macOS
          voice.name.includes('Microsoft Hazel') || // Windows
          voice.lang.startsWith('en') && voice.name.includes('Female')
        );
      }

      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Make it sound more natural and child-friendly
      utterance.rate = bird.voiceSettings.speed || 0.9; // Slightly slower for clarity
      utterance.pitch = bird.voiceSettings.pitch !== undefined ? 
        1 + (bird.voiceSettings.pitch / 10) : 1.1; // Slightly higher pitch for friendliness
      utterance.volume = 0.8; // Not too loud

      // Add natural pauses and intonation
      const processedText = addNaturalPauses(text);
      utterance.text = processedText;

      utterance.onstart = () => {
        // Trigger talking animation
        setBirdMood(birdId, 'talk');
        triggerBirdAnimation(birdId, 'talk');
      };

      utterance.onend = () => {
        // Return to idle mood
        setBirdMood(birdId, 'idle');
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setBirdMood(birdId, 'idle');
        resolve();
      };

      speechSynthesis.speak(utterance);
    });
  }, [birds, setBirdMood, triggerBirdAnimation]);

  // Add natural pauses and intonation to text
  const addNaturalPauses = useCallback((text: string): string => {
    return text
      .replace(/\./g, '. ') // Pause after periods
      .replace(/\?/g, '? ') // Pause after questions
      .replace(/!/g, '! ') // Pause after exclamations
      .replace(/,/g, ', ') // Brief pause after commas
      .replace(/\s+/g, ' ') // Clean up extra spaces
      .trim();
  }, []);

  // Initialize conversation script based on current segment
  const initializeSegmentScript = useCallback((segment: ConversationSegment) => {
    const scripts = {
      opening_comfort: [
        {
          speaker: 'chirpy',
          text: "Hi there! I'm Chirpy, and I'm so excited to meet you!",
          mood: 'cheer'
        },
        {
          speaker: 'chirpy', 
          text: "Can you tell me your name?",
          mood: 'idle',
          waitForResponse: true,
          analysisObjectives: ['assess_comfort_level', 'measure_speech_clarity', 'evaluate_willingness']
        },
        {
          speaker: 'chirpy',
          text: "What a wonderful name! I love talking to new friends. How are you feeling today?",
          mood: 'cheer',
          waitForResponse: true,
          analysisObjectives: ['assess_emotional_state', 'evaluate_self_awareness', 'measure_engagement']
        }
      ],
      favorite_things: [
        {
          speaker: 'chirpy',
          text: "I love learning about what makes people happy!",
          mood: 'think'
        },
        {
          speaker: 'chirpy',
          text: "What's something you really, really like to do?",
          mood: 'idle',
          waitForResponse: true,
          analysisObjectives: ['assess_enthusiasm', 'measure_detail_sharing', 'evaluate_interests']
        },
        {
          speaker: 'chirpy',
          text: "That sounds amazing! Can you show me how excited you get when you do that?",
          mood: 'cheer',
          waitForResponse: true,
          analysisObjectives: ['measure_emotional_expression', 'assess_gesture_use', 'evaluate_spontaneity']
        }
      ],
      social_introduction: [
        {
          speaker: 'buddy',
          text: "Hey Chirpy, who's your new friend?",
          mood: 'idle'
        },
        {
          speaker: 'chirpy',
          text: "This is my friend! What do you usually do when you meet someone new?",
          mood: 'demo',
          waitForResponse: true,
          analysisObjectives: ['assess_social_comfort', 'evaluate_introduction_skills', 'measure_adaptability']
        }
      ],
      emotion_recognition: [
        {
          speaker: 'chirpy',
          text: "Let's play a fun game! I'm going to show you different feelings with my face.",
          mood: 'demo'
        },
        {
          speaker: 'chirpy',
          text: "Look at my face now - how do you think I'm feeling?",
          mood: 'cheer',
          waitForResponse: true,
          analysisObjectives: ['assess_emotion_recognition', 'evaluate_attention', 'measure_understanding']
        },
        {
          speaker: 'chirpy',
          text: "Great job! Now can you show me what you look like when you're really happy?",
          mood: 'idle',
          waitForResponse: true,
          analysisObjectives: ['assess_expression_control', 'measure_facial_mirroring', 'evaluate_compliance']
        }
      ],
      story_sharing: [
        {
          speaker: 'chirpy',
          text: "I want to tell you about my day, and then maybe you can tell me about yours!",
          mood: 'think'
        },
        {
          speaker: 'chirpy',
          text: "This morning I flew around the beautiful forest and saw a family of rabbits playing together. It made me so happy to see them having fun!",
          mood: 'cheer'
        },
        {
          speaker: 'chirpy',
          text: "Now, what was the best part of your day so far?",
          mood: 'idle',
          waitForResponse: true,
          analysisObjectives: ['assess_listening_attention', 'evaluate_narrative_ability', 'measure_reciprocity']
        }
      ]
    };

    return scripts[segment.id as keyof typeof scripts] || [
      {
        speaker: 'chirpy',
        text: `Let's talk about ${segment.title}!`,
        mood: 'cheer',
        waitForResponse: true,
        analysisObjectives: ['general_assessment']
      }
    ];
  }, []);

  // Handle analysis updates
  const handleAnalysisUpdate = useCallback((analysis: RealTimeAnalysisState) => {
    setAnalysisState(analysis);

    // Adaptive responses based on real-time analysis
    const currentSegment = segments[currentSegmentIndex];
    if (!currentSegment) return;

    // Check for adaptive scenarios
    for (const scenario of currentSegment.adaptiveScenarios) {
      const shouldTrigger = checkAdaptiveTrigger(scenario.triggerCondition, analysis);
      
      if (shouldTrigger) {
        applyAdaptiveResponse(scenario.response, analysis);
        
        // Log the adaptation
        conversationDataRef.current.adaptiveChanges.push({
          trigger: scenario.triggerCondition,
          change: `Applied ${scenario.triggerCondition} adaptation`,
          timestamp: Date.now()
        });

        setConversationFlow(prev => ({
          ...prev,
          adaptations: [...prev.adaptations, {
            timestamp: Date.now(),
            trigger: scenario.triggerCondition,
            change: `Mood: ${scenario.response.birdBehavior.mood}, Speech speed: ${scenario.response.speechModification.speed}`,
            reason: `Child showing signs of ${scenario.triggerCondition}`
          }],
          sessionMetrics: {
            ...prev.sessionMetrics,
            adaptationCount: prev.adaptationCount + 1
          }
        }));

        break; // Only apply one adaptation at a time
      }
    }
  }, [currentSegmentIndex, segments]);

  // Check if adaptive trigger conditions are met
  const checkAdaptiveTrigger = useCallback((
    condition: string, 
    analysis: RealTimeAnalysisState
  ): boolean => {
    const { current } = analysis;
    
    switch (condition) {
      case 'anxious':
        return current.comfortLevel.level < 40 || 
               current.facialEmotion.valence < -0.3 ||
               current.comfortLevel.indicators.overwhelmed;
      
      case 'excited':
        return current.facialEmotion.arousal > 0.7 && 
               current.facialEmotion.valence > 0.5;
      
      case 'disengaged':
        return current.engagementLevel.level < 30 ||
               current.engagementLevel.trend === 'decreasing';
      
      case 'confident':
        return current.comfortLevel.level > 70 &&
               current.speechMetrics.naturalness > 70;
      
      case 'overwhelmed':
        return current.comfortLevel.indicators.overwhelmed ||
               (current.facialEmotion.arousal > 0.8 && current.facialEmotion.valence < 0);
      
      default:
        return false;
    }
  }, []);

  // Apply adaptive response
  const applyAdaptiveResponse = useCallback((response: any, analysis: RealTimeAnalysisState) => {
    // Update bird behavior
    setBirdMood(birdConversationState.currentSpeaker, response.birdBehavior.mood);
    
    // Speech modifications will be applied to future speech synthesis
    // (This would integrate with TTS system in production)
    
    // Interaction adjustments affect conversation flow
    if (response.interactionAdjustment.encouragementLevel === 'high') {
      // Add encouraging interjections
      speakAsBird('chirpy', "You're doing great! Take your time.");
    }
  }, [birdConversationState.currentSpeaker, setBirdMood, speakAsBird]);

  // Start conversation
  const startConversation = useCallback(async () => {
    setIsActive(true);
    sessionStartTime.current = Date.now();
    
    const firstSegment = segments[0];
    if (!firstSegment) return;

    const script = initializeSegmentScript(firstSegment);
    setConversationScript(script);
    
    // Begin with first line
    await executeConversationStep(0, script);
  }, [segments, initializeSegmentScript]);

  // Execute conversation step
  const executeConversationStep = useCallback(async (
    stepIndex: number, 
    script: typeof conversationScript
  ) => {
    if (stepIndex >= script.length) {
      // Segment complete, move to next
      await moveToNextSegment();
      return;
    }

    const step = script[stepIndex];
    
    // Update current speaker
    setBirdConversationState(prev => ({
      ...prev,
      currentSpeaker: step.speaker
    }));

    // Set bird mood if specified
    if (step.mood) {
      setBirdMood(step.speaker, step.mood);
    }

    // Speak the line with enhanced TTS
    await speakAsBirdWithTTS(step.speaker, step.text);

    // Record the turn
    const turn: ConversationTurn = {
      speaker: step.speaker,
      content: step.text,
      timestamp: Date.now(),
      duration: step.text.length * 50 // Rough estimate
    };

    conversationDataRef.current.turns.push(turn);

    if (step.waitForResponse) {
      // Wait for child response
      setIsWaitingForResponse(true);
      setCurrentPrompt(step.text);
      responseStartTime.current = Date.now();
      
      // Set up objectives for analysis
      if (step.analysisObjectives) {
        // This would be used by the analysis engine to focus on specific metrics
        console.log('Analysis objectives:', step.analysisObjectives);
      }
    } else {
      // Continue to next step after a brief pause
      setTimeout(() => {
        executeConversationStep(stepIndex + 1, script);
      }, 2000);
    }
  }, [setBirdMood, speakAsBird]);

  // Handle child response
  const handleChildResponse = useCallback((response: string, audioBlob?: Blob) => {
    if (!isWaitingForResponse) return;

    const responseTime = Date.now() - responseStartTime.current;
    setChildResponse(response);
    setIsWaitingForResponse(false);

    // Record child's turn
    const childTurn: ConversationTurn = {
      speaker: 'child',
      content: response,
      timestamp: Date.now(),
      duration: responseTime,
      analysis: {
        speechQuality: analysisState?.current.speechMetrics.clarity || 0,
        emotionalAppropriate: analysisState?.current.facialEmotion.valence > -0.2 || false,
        reciprocity: response.length > 5, // Basic reciprocity check
        engagement: analysisState?.current.engagementLevel.level || 0,
        skillsDisplayed: [] // Would be populated by more sophisticated analysis
      }
    };

    conversationDataRef.current.turns.push(childTurn);

    // Update session metrics
    setConversationFlow(prev => ({
      ...prev,
      sessionMetrics: {
        ...prev.sessionMetrics,
        totalInteractions: prev.sessionMetrics.totalInteractions + 1,
        successfulExchanges: response.length > 0 ? prev.sessionMetrics.successfulExchanges + 1 : prev.sessionMetrics.successfulExchanges,
        overallEngagement: analysisState?.current.engagementLevel.level || prev.sessionMetrics.overallEngagement
      }
    }));

    // Generate dynamic response based on child's input
    generateDynamicResponse(response);

    // Continue conversation after a moment
    setTimeout(() => {
      const currentScript = conversationScript;
      const currentStepIndex = currentScript.findIndex(step => step.waitForResponse && step.text === currentPrompt);
      executeConversationStep(currentStepIndex + 1, currentScript);
    }, 1500);
  }, [isWaitingForResponse, currentPrompt, conversationScript, analysisState]);

  // Generate dynamic response to child's input
  const generateDynamicResponse = useCallback((response: string) => {
    const responses = [
      "That's wonderful!",
      "I love hearing about that!",
      "You're such a good storyteller!",
      "That sounds really interesting!",
      "Thank you for sharing that with me!"
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Add encouraging response
    setTimeout(() => {
      speakAsBird('chirpy', randomResponse);
      triggerBirdAnimation('chirpy', 'wing_flap');
    }, 500);
  }, [speakAsBird, triggerBirdAnimation]);

  // Move to next segment
  const moveToNextSegment = useCallback(async () => {
    const nextIndex = currentSegmentIndex + 1;
    
    if (nextIndex >= segments.length) {
      // Assessment complete
      await completeAssessment();
      return;
    }

    setCurrentSegmentIndex(nextIndex);
    const nextSegment = segments[nextIndex];
    
    // Update conversation flow
    setConversationFlow(prev => ({
      ...prev,
      currentSegment: nextSegment.id,
      completedSegments: [...prev.completedSegments, segments[currentSegmentIndex].id],
      upcomingSegments: segments.slice(nextIndex + 1).map(s => s.id)
    }));

    // Initialize new segment
    const script = initializeSegmentScript(nextSegment);
    setConversationScript(script);
    
    // Brief transition
    await speakAsBird('chirpy', "Great job! Let's try something new now.");
    
    setTimeout(() => {
      executeConversationStep(0, script);
    }, 2000);

    // Update progress
    const progress = (nextIndex / segments.length) * 100;
    onProgressUpdate?.(progress);
  }, [currentSegmentIndex, segments, initializeSegmentScript, speakAsBird, onProgressUpdate]);

  // Complete assessment
  const completeAssessment = useCallback(async () => {
    setIsActive(false);
    
    // Final celebration
    setBirdMood('chirpy', 'celebrate');
    await speakAsBird('chirpy', "You did such an amazing job! I had so much fun talking with you!");
    triggerBirdAnimation('chirpy', 'wing_flap');

    // Generate assessment results (this would be much more sophisticated in production)
    const results: ConversationalAssessmentScore = {
      overallScore: Math.min(100, (conversationFlow.sessionMetrics.successfulExchanges / conversationFlow.sessionMetrics.totalInteractions) * 100),
      categoryScores: {
        verbalCommunication: {
          score: analysisState?.current.speechMetrics.clarity || 75,
          confidence: 85,
          evidence: [],
          trend: 'stable',
          comparison: 'typical'
        },
        nonVerbalCommunication: {
          score: analysisState?.current.eyeContact.quality === 'natural' ? 80 : 60,
          confidence: 80,
          evidence: [],
          trend: 'stable', 
          comparison: 'typical'
        },
        socialEngagement: {
          score: analysisState?.current.engagementLevel.level || 70,
          confidence: 90,
          evidence: [],
          trend: analysisState?.current.engagementLevel.trend === 'increasing' ? 'improving' : 'stable',
          comparison: 'typical'
        },
        emotionalRegulation: {
          score: analysisState?.current.comfortLevel.level || 70,
          confidence: 85,
          evidence: [],
          trend: 'stable',
          comparison: 'typical'
        },
        adaptability: {
          score: 75,
          confidence: 75,
          evidence: [],
          trend: 'stable',
          comparison: 'typical'
        }
      },
      naturalBehaviors: [],
      conversationHighlights: [],
      developmentAreas: [],
      strengths: []
    };

    onAssessmentComplete(results);
  }, [analysisState, conversationFlow, onAssessmentComplete, setBirdMood, speakAsBird, triggerBirdAnimation]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Real-time Analysis Engine (hidden) */}
      <RealTimeAnalysisEngine
        onAnalysisUpdate={handleAnalysisUpdate}
        isActive={isActive}
        enableFacialAnalysis={true}
        enableSpeechAnalysis={true}
        enableEyeTracking={true}
      />

      {/* Bird Characters */}
      <div className="flex justify-center space-x-8">
        {birds.map(bird => (
          <RiveBirdCharacter
            key={bird.id}
            character={bird}
            currentMood={birdConversationState.currentSpeaker === bird.id ? 'cheer' : 'idle'}
            isActive={birdConversationState.currentSpeaker === bird.id}
            size="large"
            realTimeEmotion={analysisState?.current.facialEmotion}
            onReady={() => registerBird(bird.id, null)}
          />
        ))}
      </div>

      {/* Conversation Interface */}
      <ChirpCard className="text-center space-y-4">
        {!isActive ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-primary">Ready to Meet Your New Bird Friends?</h2>
            <p className="text-muted-foreground">
              We're going to have a fun conversation together! Just be yourself and talk naturally.
            </p>
            <ChirpButton onClick={startConversation} size="lg">
              Start Conversation
            </ChirpButton>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Indicator */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentSegmentIndex / segments.length) * 100}%` }}
              />
            </div>
            
            {/* Current Segment Info */}
            <div className="text-sm text-muted-foreground">
              {segments[currentSegmentIndex]?.title}
            </div>

            {/* Speech Input - No typed questions, only live transcription */}
            {isWaitingForResponse && (
              <div className="space-y-4">
                <div className="bg-secondary/20 rounded-lg p-4">
                  <p className="text-muted-foreground text-sm mb-2">
                    🎤 Listening for your response...
                  </p>
                  <p className="text-primary font-medium">
                    Take your time and speak naturally!
                  </p>
                </div>
                
                <SpeechRecorder
                  onRecordingComplete={(audioBlob, analysis) => {
                    handleChildResponse(analysis.transcription, audioBlob);
                  }}
                  maxDuration={30}
                  expectedKeywords={[]}
                  showLiveTranscription={true}
                />
              </div>
            )}

            {/* Live Analysis Display */}
            <LiveAnalysisDisplay 
              analysisState={analysisState}
              isVisible={isActive}
              className="max-w-2xl mx-auto"
            />
          </div>
        )}
      </ChirpCard>
    </div>
  );
}