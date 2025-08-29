import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ChirpButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'highlight';
  size?: 'small' | 'medium' | 'large';
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}

export function ChirpButton({ 
  children, 
  className, 
  variant = 'primary',
  size = 'medium',
  icon: Icon,
  onClick,
  disabled
}: ChirpButtonProps) {
  const variantClasses = {
    primary: 'bg-gradient-primary hover:shadow-floating text-primary-foreground',
    secondary: 'bg-gradient-secondary hover:shadow-floating text-secondary-foreground',
    accent: 'bg-accent hover:bg-accent-hover text-accent-foreground',
    highlight: 'bg-highlight hover:shadow-glow text-highlight-foreground'
  };

  const sizeClasses = {
    small: 'py-2 px-4 text-sm',
    medium: 'py-4 px-8 text-base',
    large: 'py-6 px-12 text-lg'
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'font-semibold rounded-full shadow-gentle transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {Icon && <Icon className="mr-2 h-5 w-5" />}
      {children}
    </Button>
  );
}