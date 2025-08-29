import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { Bird, Heart, Stethoscope } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();

  const userTypes = [
    {
      id: 'kid',
      title: 'Kid',
      description: 'Let\'s practice conversations together!',
      icon: Bird,
      color: 'primary',
      route: '/kid/assessment'
    },
    {
      id: 'parent',
      title: 'Parent',
      description: 'Track your child\'s progress',
      icon: Heart,
      color: 'secondary',
      route: '/parent/dashboard'
    },
    {
      id: 'therapist',
      title: 'Therapist',
      description: 'Manage clients and create scenarios',
      icon: Stethoscope,
      color: 'accent',
      route: '/therapist/dashboard'
    }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-secondary/20 p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-hero font-bold gradient-text mb-4">
            Welcome to Chirp!
          </h1>
          <p className="text-large text-muted-foreground">
            Choose your adventure
          </p>
        </div>

        <div className="space-y-6 animate-slide-up">
          {userTypes.map((type, index) => (
            <ChirpCard 
              key={type.id}
              variant="interactive"
              className={`animate-slide-up delay-${index * 100}`}
              onClick={() => navigate(type.route)}
            >
              <div className="flex items-center space-x-4">
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center
                  ${type.color === 'primary' ? 'bg-gradient-primary' :
                    type.color === 'secondary' ? 'bg-gradient-secondary' :
                    'bg-accent'
                  }
                `}>
                  <type.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-card-foreground mb-1">
                    {type.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </div>
            </ChirpCard>
          ))}
        </div>

        <div className="floating-companion">
          <BirdMascot 
            size="medium"
            showBubble
            message="Pick one to get started!"
          />
        </div>
      </div>
    </div>
  );
}