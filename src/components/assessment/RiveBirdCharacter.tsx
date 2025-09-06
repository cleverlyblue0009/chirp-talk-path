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

  // Enhanced speech synthesis with improved lip-sync
  const speak = useCallback(async (
    text: string, 
    audioUrl?: string, 
    visemeTimeline?: Array<{time: number, viseme: string}>
  ) => {
    if (!isReady || !rive) return;

    const visemeInput = getVisemeInput();
    const moodInput = getMoodInput();
    
    // Set talking mood
    if (moodInput) {
      moodInput.value = 'talk';
    }

    try {
      if (audioUrl) {
        // Use provided TTS audio with viseme data
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        if (visemeTimeline && visemeInput) {
          // Schedule precise viseme changes
          visemeTimeline.forEach(frame => {
            setTimeout(() => {
              const visemeIndex = VISEME_MAP[frame.viseme as keyof typeof VISEME_MAP] || 0;
              visemeInput.value = visemeIndex;
            }, frame.time * 1000);
          });

          // Reset to rest position after speech
          const totalDuration = Math.max(...visemeTimeline.map(f => f.time)) * 1000;
          setTimeout(() => {
            visemeInput.value = 0; // REST position
            if (moodInput) moodInput.value = 'idle';
          }, totalDuration + 500);
        }

        await audio.play();
      } else {
        // Use Web Speech API with enhanced mouth animation
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice for natural speech
        const voices = speechSynthesis.getVoices();
        let selectedVoice = voices.find(voice => 
          voice.name.includes(character.voiceSettings.voice)
        );
        
        if (!selectedVoice) {
          // Fallback to quality voices
          selectedVoice = voices.find(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Natural') || voice.name.includes('Premium'))
          ) || voices.find(voice => voice.lang.startsWith('en'));
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        // Enhanced voice settings for child-friendly speech
        utterance.pitch = 1 + (character.voiceSettings.pitch / 10);
        utterance.rate = character.voiceSettings.speed * 0.9; // Slightly slower for clarity
        utterance.volume = 0.8;

        // Start enhanced mouth animation
        enhancedMouthAnimation(text, utterance.rate);

        utterance.onend = () => {
          if (visemeInput) visemeInput.value = 0; // REST position
          if (moodInput) moodInput.value = 'idle';
        };

        utterance.onerror = () => {
          if (visemeInput) visemeInput.value = 0;
          if (moodInput) moodInput.value = 'idle';
        };

        speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      // Fallback to basic mouth animation
      basicMouthAnimation(text.length);
      
      // Reset mood after fallback
      setTimeout(() => {
        if (moodInput) moodInput.value = 'idle';
      }, text.length * 100);
    }
  }, [isReady, rive, getVisemeInput, getMoodInput, character]);

  // Enhanced mouth animation based on text analysis
  const enhancedMouthAnimation = useCallback((text: string, speechRate: number) => {
    if (!isReady || !rive) return;

    const visemeInput = getVisemeInput();
    if (!visemeInput) return;

    // Analyze text for better mouth shapes
    const words = text.toLowerCase().split(/\s+/);
    const totalDuration = (text.length * 80) / speechRate; // Estimate based on speech rate
    const wordDuration = totalDuration / words.length;
    
    let currentTime = 0;

    words.forEach((word, index) => {
      setTimeout(() => {
        // Choose viseme based on prominent sounds in word
        let viseme = 0; // REST
        
        if (word.includes('a') || word.includes('ah')) viseme = 1; // AA
        else if (word.includes('e') || word.includes('ee')) viseme = 2; // EE
        else if (word.includes('o') || word.includes('oh')) viseme = 3; // OH
        else if (word.includes('m') || word.includes('b') || word.includes('p')) viseme = 4; // M
        else if (word.includes('f') || word.includes('v')) viseme = 5; // FV
        else if (word.includes('d') || word.includes('t') || word.includes('n')) viseme = 6; // DD
        
        visemeInput.value = viseme;
        
        // Brief pause between words
        setTimeout(() => {
          visemeInput.value = 0;
        }, wordDuration * 0.7);
        
      }, currentTime);
      
      currentTime += wordDuration;
    });

    // Final rest position
    setTimeout(() => {
      visemeInput.value = 0;
    }, totalDuration);
  }, [isReady, rive, getVisemeInput]);

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