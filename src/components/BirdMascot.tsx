import { useState, useEffect } from 'react';
import chirpMascot from '@/assets/chirp-mascot.png';
import { cn } from '@/lib/utils';

interface BirdMascotProps {
  message?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showBubble?: boolean;
  animation?: 'float' | 'bounce' | 'wiggle' | 'sparkle';
}

export function BirdMascot({ 
  message, 
  className, 
  size = 'medium',
  showBubble = false,
  animation = 'float'
}: BirdMascotProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
          <div className="absolute -top-16 -left-4 bg-card rounded-2xl px-4 py-2 shadow-floating border border-muted max-w-48 animate-slide-up">
            <p className="text-sm font-medium text-card-foreground">
              {message}
            </p>
            <div className="absolute bottom-0 left-8 transform translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-card"></div>
          </div>
        )}
      </div>
    </div>
  );
}