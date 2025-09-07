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

  // Voice narration function
  const speakText = useCallback((text: string) => {
    if (!speakMessage || !text) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice for child-friendly speech
    const setupVoice = () => {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(voice => 
        voice.name.includes('Samantha') || // macOS - very natural
        voice.name.includes('Google UK English Female') || // Chrome
        voice.name.includes('Microsoft Zira Desktop') || // Windows 10+
        (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female'))
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Apply voice settings
      utterance.rate = voiceSettings.rate || 0.9;
      utterance.pitch = voiceSettings.pitch || 1.1;
      utterance.volume = voiceSettings.volume || 0.8;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    };

    // Handle voice loading
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', setupVoice, { once: true });
    } else {
      setupVoice();
    }
  }, [speakMessage, voiceSettings]);

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