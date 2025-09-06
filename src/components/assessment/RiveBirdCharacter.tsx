import { useEffect, useRef, useState, useCallback } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { BirdCharacter, BirdBehaviorChange, EmotionState } from '@/types/conversational-assessment';
import { cn } from '@/lib/utils';

interface RiveBirdCharacterProps {
  character: BirdCharacter;
  currentMood?: string;
  isActive?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onAnimationComplete?: (animationName: string) => void;
  onReady?: () => void;
  realTimeEmotion?: EmotionState;
}

// Viseme mapping for lip-sync
const VISEME_MAP = {
  'REST': 0,
  'AA': 1,
  'EE': 2, 
  'OH': 3,
  'M': 4,
  'FV': 5,
  'DD': 6
};

export function RiveBirdCharacter({
  character,
  currentMood = 'idle',
  isActive = true,
  className,
  size = 'medium',
  onAnimationComplete,
  onReady,
  realTimeEmotion
}: RiveBirdCharacterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<string>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const visemeTimelineRef = useRef<Array<{time: number, viseme: string}>>([]);
  const visemeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sizeClasses = {
    small: 'w-24 h-24',
    medium: 'w-32 h-32', 
    large: 'w-48 h-48'
  };

  const {
    RiveComponent,
    rive
  } = useRive({
    src: character.riveAssetPath,
    artboard: 'ChirpBird',
    stateMachines: 'Chirp_Bird_SM',
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    }),
    autoplay: true,
    onLoad: () => {
      setIsReady(true);
      onReady?.();
    },
    onLoadError: (error) => {
      console.error('Failed to load Rive animation:', error);
      // Fallback to static image or basic animation
    }
  });

  // Get Rive inputs for controlling animations
  const getMoodInput = useCallback(() => {
    return rive?.getInput('mood');
  }, [rive]);

  const getVisemeInput = useCallback(() => {
    return rive?.getInput('viseme_index');
  }, [rive]);

  const getBlinkTrigger = useCallback(() => {
    return rive?.getInput('blink');
  }, [rive]);

  const getHopTrigger = useCallback(() => {
    return rive?.getInput('hop');
  }, [rive]);

  const getWingFlapTrigger = useCallback(() => {
    return rive?.getInput('wing_flap');
  }, [rive]);

  // Update mood when prop changes
  useEffect(() => {
    if (!isReady || !rive) return;

    const moodInput = getMoodInput();
    if (moodInput && currentMood !== currentAnimation) {
      moodInput.value = currentMood;
      setCurrentAnimation(currentMood);
    }
  }, [currentMood, isReady, rive, getMoodInput, currentAnimation]);

  // React to real-time emotion changes
  useEffect(() => {
    if (!realTimeEmotion || !isReady || !rive) return;

    const moodInput = getMoodInput();
    if (!moodInput) return;

    // Map child's emotion to appropriate bird response
    let birdMood = 'idle';
    
    if (realTimeEmotion.valence > 0.7) {
      birdMood = 'celebrate'; // Child is very happy
    } else if (realTimeEmotion.valence < -0.3) {
      birdMood = 'comfort'; // Child seems sad/upset
    } else if (realTimeEmotion.arousal > 0.8) {
      birdMood = 'cheer'; // Child is excited
    } else if (realTimeEmotion.primary === 'confused') {
      birdMood = 'think'; // Child looks confused
    }

    // Only change if it's different and makes sense
    if (birdMood !== currentAnimation && birdMood !== currentMood) {
      moodInput.value = birdMood;
      setCurrentAnimation(birdMood);
    }
  }, [realTimeEmotion, isReady, rive, getMoodInput, currentAnimation, currentMood]);

  // Speech synthesis with lip-sync
  const speak = useCallback(async (
    text: string, 
    audioUrl?: string, 
    visemeTimeline?: Array<{time: number, viseme: string}>
  ) => {
    if (!isReady || !rive) return;

    const visemeInput = getVisemeInput();
    if (!visemeInput) return;

    try {
      let audio: HTMLAudioElement;
      
      if (audioUrl) {
        // Use provided TTS audio
        audio = new Audio(audioUrl);
      } else {
        // Generate TTS using Web Speech API
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = speechSynthesis.getVoices().find(
          voice => voice.name.includes(character.voiceSettings.voice)
        ) || speechSynthesis.getVoices()[0];
        utterance.pitch = character.voiceSettings.pitch;
        utterance.rate = character.voiceSettings.speed;
        
        // Create audio from speech synthesis
        speechSynthesis.speak(utterance);
        return; // Web Speech API doesn't provide audio file for viseme sync
      }

      audioRef.current = audio;
      
      if (visemeTimeline) {
        visemeTimelineRef.current = visemeTimeline;
        
        // Schedule viseme changes
        const startTime = Date.now();
        
        visemeTimeline.forEach(frame => {
          const timeout = setTimeout(() => {
            const visemeIndex = VISEME_MAP[frame.viseme as keyof typeof VISEME_MAP] || 0;
            visemeInput.value = visemeIndex;
          }, frame.time * 1000);
          
          // Store timeout for cleanup
          if (!visemeTimeoutRef.current) {
            visemeTimeoutRef.current = timeout;
          }
        });

        // Reset to rest position after speech
        const totalDuration = Math.max(...visemeTimeline.map(f => f.time)) * 1000;
        setTimeout(() => {
          visemeInput.value = 0; // REST position
        }, totalDuration + 500);
      }

      // Play audio
      await audio.play();
      
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      // Fallback to basic mouth animation
      basicMouthAnimation(text.length);
    }
  }, [isReady, rive, getVisemeInput, character]);

  // Fallback mouth animation when TTS/viseme data unavailable
  const basicMouthAnimation = useCallback((textLength: number) => {
    if (!isReady || !rive) return;

    const visemeInput = getVisemeInput();
    if (!visemeInput) return;

    const duration = Math.max(2000, textLength * 100); // Rough estimate
    const interval = 200;
    let elapsed = 0;

    const animate = () => {
      if (elapsed >= duration) {
        visemeInput.value = 0; // REST
        return;
      }

      // Simple alternating mouth shapes
      const shapes = [1, 3, 2, 4]; // AA, OH, EE, M
      visemeInput.value = shapes[Math.floor(elapsed / interval) % shapes.length];
      
      elapsed += interval;
      setTimeout(animate, interval);
    };

    animate();
  }, [isReady, rive, getVisemeInput]);

  // Trigger animations
  const triggerBlink = useCallback(() => {
    const blinkTrigger = getBlinkTrigger();
    if (blinkTrigger) blinkTrigger.fire();
  }, [getBlinkTrigger]);

  const triggerHop = useCallback(() => {
    const hopTrigger = getHopTrigger();
    if (hopTrigger) hopTrigger.fire();
  }, [getHopTrigger]);

  const triggerWingFlap = useCallback(() => {
    const wingFlapTrigger = getWingFlapTrigger();
    if (wingFlapTrigger) wingFlapTrigger.fire();
  }, [getWingFlapTrigger]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (visemeTimeoutRef.current) {
        clearTimeout(visemeTimeoutRef.current);
      }
    };
  }, []);

  // Expose methods to parent component
  useEffect(() => {
    if (containerRef.current && isReady) {
      // Attach methods to the container for external access
      const container = containerRef.current as any;
      container.speak = speak;
      container.triggerBlink = triggerBlink;
      container.triggerHop = triggerHop;
      container.triggerWingFlap = triggerWingFlap;
      container.setMood = (mood: string) => {
        const moodInput = getMoodInput();
        if (moodInput) moodInput.value = mood;
      };
    }
  }, [isReady, speak, triggerBlink, triggerHop, triggerWingFlap, getMoodInput]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative transition-all duration-300',
        sizeClasses[size],
        isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-75',
        className
      )}
    >
      {/* Rive Animation */}
      <div className="w-full h-full">
        <RiveComponent className="w-full h-full" />
      </div>

      {/* Loading State */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/20 rounded-lg">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Character Name Badge */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium shadow-sm">
          {character.name}
        </div>
      </div>

      {/* Activity Indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}

// Hook for managing multiple bird characters
export function useBirdCharacters(characters: BirdCharacter[]) {
  const [activeBird, setActiveBird] = useState<string | null>(null);
  const [birdRefs, setBirdRefs] = useState<Map<string, any>>(new Map());

  const registerBird = useCallback((birdId: string, ref: any) => {
    setBirdRefs(prev => new Map(prev.set(birdId, ref)));
  }, []);

  const speakAsBird = useCallback(async (
    birdId: string,
    text: string,
    audioUrl?: string,
    visemeTimeline?: Array<{time: number, viseme: string}>
  ) => {
    const birdRef = birdRefs.get(birdId);
    if (birdRef?.speak) {
      setActiveBird(birdId);
      await birdRef.speak(text, audioUrl, visemeTimeline);
      // Keep active for a moment after speaking
      setTimeout(() => setActiveBird(null), 1000);
    }
  }, [birdRefs]);

  const triggerBirdAnimation = useCallback((birdId: string, animation: string) => {
    const birdRef = birdRefs.get(birdId);
    if (birdRef) {
      switch (animation) {
        case 'blink':
          birdRef.triggerBlink?.();
          break;
        case 'hop':
          birdRef.triggerHop?.();
          break;
        case 'wing_flap':
          birdRef.triggerWingFlap?.();
          break;
        default:
          birdRef.setMood?.(animation);
      }
    }
  }, [birdRefs]);

  const setBirdMood = useCallback((birdId: string, mood: string) => {
    const birdRef = birdRefs.get(birdId);
    if (birdRef?.setMood) {
      birdRef.setMood(mood);
    }
  }, [birdRefs]);

  return {
    activeBird,
    registerBird,
    speakAsBird,
    triggerBirdAnimation,
    setBirdMood
  };
}