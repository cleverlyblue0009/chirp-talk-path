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

  // Enhanced TTS with child-friendly voices and natural speech patterns
  const speakAsBirdWithTTS = useCallback(async (birdId: string, text: string) => {
    const bird = birds.find(b => b.id === birdId);
    if (!bird) return;

    return new Promise<void>((resolve) => {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Wait for voices to be loaded
      const setupVoice = () => {
        const voices = speechSynthesis.getVoices();
        let selectedVoice = null;

        // Prefer high-quality, kid-friendly voices for different birds
        if (birdId === 'chirpy') {
          selectedVoice = voices.find(voice => 
            // Prioritize natural, warm female voices
            voice.name.includes('Samantha') || // macOS - very natural
            voice.name.includes('Google UK English Female') || // Chrome
            voice.name.includes('Microsoft Zira Desktop') || // Windows 10+
            voice.name.includes('Allison') || // Some systems
            (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female') && voice.name.includes('neural'))
          ) || voices.find(voice => 
            voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')
          );
        } else if (birdId === 'buddy') {
          selectedVoice = voices.find(voice => 
            // Friendly, energetic male voices
            voice.name.includes('Alex') || // macOS - natural male
            voice.name.includes('Google UK English Male') || // Chrome
            voice.name.includes('Microsoft Mark Desktop') || // Windows 10+
            voice.name.includes('Tom') || // Some systems
            (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male') && voice.name.includes('neural'))
          ) || voices.find(voice => 
            voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male')
          );
        } else if (birdId === 'wise') {
          selectedVoice = voices.find(voice => 
            // Gentle, wise-sounding voices
            voice.name.includes('Victoria') || // macOS
            voice.name.includes('Microsoft Hazel Desktop') || // Windows 10+
            voice.name.includes('Karen') || // Some systems
            (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female') && voice.name.includes('neural'))
          ) || voices.find(voice => 
            voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')
          );
        }

        // Fallback to the most natural English voice available
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => 
            voice.lang.startsWith('en') && (
              voice.name.includes('neural') || 
              voice.name.includes('premium') ||
              voice.name.includes('natural')
            )
          ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Enhanced voice settings for child-friendly, natural speech
        const baseRate = bird.voiceSettings.speed || 0.85; // Slower for clarity and warmth
        const basePitch = bird.voiceSettings.pitch !== undefined ? 
          1 + (bird.voiceSettings.pitch / 8) : 1.15; // Higher pitch for friendliness
        
        // Adjust based on bird personality
        if (birdId === 'chirpy') {
          utterance.rate = baseRate;
          utterance.pitch = basePitch;
          utterance.volume = 0.85;
        } else if (birdId === 'buddy') {
          utterance.rate = baseRate + 0.1; // Slightly faster for playfulness
          utterance.pitch = basePitch + 0.1;
          utterance.volume = 0.9; // Slightly louder for energy
        } else if (birdId === 'wise') {
          utterance.rate = baseRate - 0.1; // Slower for wisdom
          utterance.pitch = basePitch - 0.15; // Lower for authority but still friendly
          utterance.volume = 0.8;
        }

        // Add natural pauses and child-friendly intonation
        const processedText = addNaturalChildFriendlyPauses(text, birdId);
        utterance.text = processedText;

        utterance.onstart = () => {
          // Trigger talking animation with personality
          setBirdMood(birdId, 'talk');
          triggerBirdAnimation(birdId, 'talk');
        };

        utterance.onend = () => {
          // Return to appropriate idle mood
          setBirdMood(birdId, 'idle');
          resolve();
        };

        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          setBirdMood(birdId, 'idle');
          resolve();
        };

        speechSynthesis.speak(utterance);
      };

      // Handle voice loading
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener('voiceschanged', setupVoice, { once: true });
      } else {
        setupVoice();
      }
    });
  }, [birds, setBirdMood, triggerBirdAnimation]);

  // Add natural, child-friendly pauses and intonation to text
  const addNaturalChildFriendlyPauses = useCallback((text: string, birdId: string): string => {
    let processedText = text;
    
    // Add personality-specific speech patterns
    if (birdId === 'chirpy') {
      // Warm, encouraging tone with gentle pauses
      processedText = processedText
        .replace(/\./g, '... ') // Longer pause for warmth
        .replace(/\?/g, '? ') // Questioning tone
        .replace(/!/g, '! ') // Excited but not overwhelming
        .replace(/,/g, ', ') // Natural breathing pauses
        .replace(/\b(you|your)\b/gi, 'you ') // Emphasize personal connection
        .replace(/\b(great|wonderful|amazing|fantastic)\b/gi, (match) => `${match} `) // Emphasize praise
    } else if (birdId === 'buddy') {
      // Playful, energetic tone with bouncy rhythm
      processedText = processedText
        .replace(/\./g, '. ') // Quick pauses for energy
        .replace(/\?/g, '?? ') // Extra enthusiasm in questions
        .replace(/!/g, '!! ') // High energy exclamations
        .replace(/,/g, ', ') // Brief pauses
        .replace(/\b(fun|play|game|awesome|cool)\b/gi, (match) => `${match}! `) // Add excitement to fun words
    } else if (birdId === 'wise') {
      // Gentle, thoughtful tone with contemplative pauses
      processedText = processedText
        .replace(/\./g, '... ') // Thoughtful pauses
        .replace(/\?/g, '? ') // Gentle questioning
        .replace(/!/g, '. ') // Convert exclamations to gentler periods
        .replace(/,/g, '... ') // Longer contemplative pauses
        .replace(/\b(think|remember|understand|learn)\b/gi, (match) => `${match}... `) // Pause after thinking words
    }
    
    // General child-friendly improvements
    return processedText
      .replace(/\b(hi|hello|hey)\b/gi, (match) => `${match}! `) // Friendly greetings
      .replace(/\b(thank you|thanks)\b/gi, (match) => `${match}! `) // Grateful tone
      .replace(/\b(please)\b/gi, 'please ') // Polite pauses
      .replace(/\s+/g, ' ') // Clean up extra spaces
      .replace(/\.\.\.\s*\.\.\./g, '... ') // Fix multiple ellipses
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
          text: "Let's play an exciting feeling game! I love seeing all the different expressions you can make!",
          mood: 'demo'
        },
        {
          speaker: 'chirpy',
          text: "Can you show me your biggest, happiest smile? I want to see those happy eyes light up too!",
          mood: 'cheer',
          waitForResponse: true,
          analysisObjectives: ['assess_expression_control', 'measure_facial_mirroring', 'evaluate_emotional_range']
        },
        {
          speaker: 'chirpy',
          text: "Wow, that was amazing! Now tell me about a time when you felt really excited, and let your face show me that excitement!",
          mood: 'idle',
          waitForResponse: true,
          analysisObjectives: ['assess_emotional_storytelling', 'measure_expression_authenticity', 'evaluate_narrative_emotion_connection']
        },
        {
          speaker: 'buddy',
          text: "Your turn to be the teacher! Can you show me what a confused face looks like? And maybe tell me when you might feel confused?",
          mood: 'think',
          waitForResponse: true,
          analysisObjectives: ['assess_emotional_understanding', 'evaluate_teaching_ability', 'measure_empathy']
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
      {/* Real-time Analysis Engine (always active for all questions) */}
      <RealTimeAnalysisEngine
        onAnalysisUpdate={handleAnalysisUpdate}
        isActive={isActive}
        enableFacialAnalysis={true}
        enableSpeechAnalysis={true}
        enableEyeTracking={true}
        analysisFrequency={300} // More frequent analysis for better responsiveness
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

            {/* Interactive Response Interface - Voice and Facial Recognition */}
            {isWaitingForResponse && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/20 rounded-lg p-4 border-2 border-primary/20">
                  <p className="text-primary font-medium text-center mb-2">
                    🎤 I'm listening and watching for your response!
                  </p>
                  <p className="text-muted-foreground text-sm text-center">
                    Speak naturally and show me how you feel with your face! 😊
                  </p>
                </div>
                
                {/* Combined Speech and Facial Recognition */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Speech Recognition */}
                  <SpeechRecorder
                    onRecordingComplete={(audioBlob, analysis) => {
                      handleChildResponse(analysis.transcription, audioBlob);
                    }}
                    maxDuration={30}
                    expectedKeywords={[]}
                    showLiveTranscription={true}
                  />
                  
                  {/* Live Facial Recognition Feedback */}
                  <div className="bg-card rounded-lg p-4 border">
                    <div className="text-center space-y-2">
                      <div className="text-2xl">📹</div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Live Expression Detection
                      </p>
                      {analysisState?.current.facialEmotion && (
                        <div className="space-y-2">
                          <div className="bg-primary/10 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Current expression:</p>
                            <p className="text-lg font-bold capitalize text-primary">
                              {analysisState.current.facialEmotion.primary}
                            </p>
                            <div className="w-full bg-secondary rounded-full h-2 mt-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-500"
                                style={{ width: `${analysisState.current.facialEmotion.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Eye Contact Feedback */}
                          <div className="bg-secondary/20 rounded-lg p-2">
                            <div className="flex items-center justify-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                analysisState.current.eyeContact.isLookingAtCamera 
                                  ? 'bg-green-500 animate-pulse' 
                                  : 'bg-gray-400'
                              }`} />
                              <p className="text-xs text-muted-foreground">
                                {analysisState.current.eyeContact.isLookingAtCamera 
                                  ? 'Great eye contact! 👀' 
                                  : 'Look at me when you speak 😊'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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