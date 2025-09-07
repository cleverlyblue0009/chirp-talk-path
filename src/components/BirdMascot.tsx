import { useState, useEffect, useCallback } from 'react';
import chirpMascot from '@/assets/chirp-mascot.png';
import { cn } from '@/lib/utils';

interface BirdMascotProps {
  message?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showBubble?: boolean;
  animation?: 'float' | 'bounce' | 'wiggle' | 'sparkle';
  speakMessage?: boolean; // New prop to enable voice narration
  voiceSettings?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  };
}

export function BirdMascot({ 
  message, 
  className, 
  size = 'medium',
  showBubble = false,
  animation = 'float',
  speakMessage = false,
  voiceSettings = {}
}: BirdMascotProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Enhanced voice narration function with character-specific voices
  const speakText = useCallback((text: string) => {
    if (!speakMessage || !text) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice for child-friendly speech with character personality
    const setupVoice = () => {
      const voices = speechSynthesis.getVoices();
      
      // Enhanced voice selection with better fallbacks
      let selectedVoice = null;
      
      // Try to find the best possible voices in order of preference
      const voicePreferences = [
        // Premium/Natural voices (best quality)
        'Google UK English Female',
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Zira Desktop - English (United States)', 
        'Samantha', // macOS
        'Alex', // macOS male
        'Victoria', // macOS female
        
        // Good fallbacks
        'Google US English',
        'Microsoft David Desktop',
        'Microsoft Mark Desktop',
        
        // Basic fallbacks
        ...voices.filter(v => v.lang.startsWith('en') && v.name.includes('Female')).map(v => v.name),
        ...voices.filter(v => v.lang.startsWith('en')).map(v => v.name)
      ];

      // Find the first available voice from our preferences
      for (const prefName of voicePreferences) {
        selectedVoice = voices.find(voice => voice.name.includes(prefName));
        if (selectedVoice) break;
      }

      // Ultimate fallback
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`🎤 Using voice: ${selectedVoice.name} for bird character`);
      }

      // Enhanced voice settings for warm, child-friendly speech
      utterance.rate = Math.max(0.6, Math.min(1.2, voiceSettings.rate || 0.85)); // Slower for clarity
      utterance.pitch = Math.max(0.8, Math.min(1.5, voiceSettings.pitch || 1.15)); // Higher for friendliness
      utterance.volume = Math.max(0.5, Math.min(1.0, voiceSettings.volume || 0.85));

      // Add natural pauses and child-friendly speech patterns
      utterance.text = addChildFriendlyPauses(text);

      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log(`🗣️ Bird speaking: "${text.substring(0, 50)}..."`);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('✅ Bird finished speaking');
      };
      
      utterance.onerror = (error) => {
        console.error('❌ Speech synthesis error:', error);
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
    };

    // Handle voice loading with timeout
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', setupVoice, { once: true });
      // Fallback timeout in case voices don't load
      setTimeout(setupVoice, 1000);
    } else {
      setupVoice();
    }
  }, [speakMessage, voiceSettings]);

  // Add child-friendly pauses and speech patterns
  const addChildFriendlyPauses = useCallback((text: string): string => {
    return text
      // Add pauses after greetings
      .replace(/\b(Hi|Hello|Hey)\b/gi, '$1!')
      // Add gentle pauses after questions
      .replace(/\?/g, '?... ')
      // Add excitement to positive words
      .replace(/\b(great|wonderful|amazing|fantastic|awesome)\b/gi, '$1!')
      // Add pauses after commas for natural breathing
      .replace(/,/g, ',... ')
      // Add emphasis to encouraging words
      .replace(/\b(you can|you're|good job|well done)\b/gi, '$1!')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Speak message when it changes
  useEffect(() => {
    if (message && showBubble && speakMessage) {
      // Small delay to allow bubble to appear first
      const timer = setTimeout(() => {
        speakText(message);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [message, showBubble, speakMessage, speakText]);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-20 h-20',
    large: 'w-32 h-32'
  };

  const animationClasses = {
    float: 'animate-float',
    bounce: 'animate-bounce-gentle',
    wiggle: 'animate-wiggle',
    sparkle: 'animate-sparkle'
  };

  return (
    <div className={cn('relative z-10', className)}>
      <div className={cn(
        'relative transition-all duration-500',
        sizeClasses[size],
        animationClasses[animation],
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}>
        <img 
          src={chirpMascot} 
          alt="Chirp - Your friendly conversation companion"
          className="w-full h-full object-contain drop-shadow-md"
        />
        
        {showBubble && message && (
          <div className={cn(
            "absolute -top-16 -left-4 bg-card rounded-2xl px-4 py-2 shadow-floating border border-muted max-w-48 animate-slide-up",
            isSpeaking && "border-primary bg-primary/5"
          )}>
            <div className="flex items-center space-x-2">
              {isSpeaking && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              <p className="text-sm font-medium text-card-foreground">
                {message}
              </p>
            </div>
            <div className={cn(
              "absolute bottom-0 left-8 transform translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent",
              isSpeaking ? "border-t-primary/20" : "border-t-card"
            )}></div>
          </div>
        )}
      </div>
    </div>
  );
}