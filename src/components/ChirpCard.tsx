import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChirpCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'floating' | 'interactive';
  onClick?: () => void;
}

export function ChirpCard({ 
  children, 
  className, 
  variant = 'default',
  onClick 
}: ChirpCardProps) {
  const variantClasses = {
    default: 'shadow-gentle',
    floating: 'shadow-floating',
    interactive: 'shadow-gentle hover:shadow-floating cursor-pointer transform hover:scale-105'
  };

  return (
    <Card 
      className={cn(
        'bg-card rounded-3xl p-6 border border-muted transition-all duration-300',
        variantClasses[variant],
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
}