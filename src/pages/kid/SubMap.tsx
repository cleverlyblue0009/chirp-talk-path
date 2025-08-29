import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, MessageCircle, Heart, BookOpen, Smile } from 'lucide-react';

interface Module {
  id: string;
  title: string;
  icon: any;
  position: { x: number; y: number };
  completed: boolean;
  current: boolean;
  locked: boolean;
}

export default function SubMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scenarioId = searchParams.get('scenario') || 'home';
  
  const [stats] = useState({
    completedModules: 3,
    totalModules: 8
  });

  const scenarioTitles: Record<string, string> = {
    home: 'At Home with Family',
    school: 'At School',
    restaurant: 'At the Restaurant',
    playground: 'At the Playground'
  };

  const modules: Module[] = [
    {
      id: 'greetings',
      title: 'Family Greetings',
      icon: Heart,
      position: { x: 50, y: 85 },
      completed: true,
      current: false,
      locked: false
    },
    {
      id: 'sharing-day',
      title: 'Sharing Your Day',
      icon: MessageCircle,
      position: { x: 30, y: 70 },
      completed: true,
      current: false,
      locked: false
    },
    {
      id: 'asking-help',
      title: 'Asking for Help',
      icon: BookOpen,
      position: { x: 70, y: 55 },
      completed: true,
      current: false,
      locked: false
    },
    {
      id: 'feelings',
      title: 'Expressing Feelings',
      icon: Smile,
      position: { x: 40, y: 40 },
      completed: false,
      current: true,
      locked: false
    },
    {
      id: 'problem-solving',
      title: 'Problem Solving',
      icon: MessageCircle,
      position: { x: 65, y: 25 },
      completed: false,
      current: false,
      locked: true
    },
    {
      id: 'complex-conversations',
      title: 'Complex Talks',
      icon: BookOpen,
      position: { x: 45, y: 10 },
      completed: false,
      current: false,
      locked: true
    }
  ];

  const progress = (stats.completedModules / stats.totalModules) * 100;

  const handleModuleClick = (module: Module) => {
    if (!module.locked) {
      console.log(`Starting ${module.title} module`);
      navigate(`/kid/scenario?module=${module.id}`);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20">
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-safe-top p-4">
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <ChirpButton 
            variant="secondary" 
            size="small" 
            icon={ArrowLeft}
            onClick={() => navigate('/kid/home')}
          >
            Back
          </ChirpButton>
          <div className="text-center">
            <h1 className="font-bold text-lg text-card-foreground">
              {scenarioTitles[scenarioId]}
            </h1>
            <p className="text-sm text-muted-foreground">Choose a lesson to practice</p>
          </div>
          <div className="w-16"> {/* Spacer */}</div>
        </div>

        {/* Progress Tracker */}
        <ChirpCard className="mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-card-foreground">Your Progress</span>
            <span className="text-sm text-muted-foreground">
              {stats.completedModules} of {stats.totalModules} completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Beginner</span>
            <span>Expert</span>
          </div>
        </ChirpCard>

        {/* Module Path */}
        <div className="relative h-96 w-full">
          {/* Winding path background */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <path
              d="M50,85 Q30,75 30,70 Q30,65 50,60 Q70,55 70,55 Q40,50 40,40 Q40,35 65,25 Q45,20 45,10"
              stroke="url(#pathGradient)"
              strokeWidth="2"
              fill="none"
              className="animate-fade-in"
            />
          </svg>

          {modules.map((module, index) => (
            <div
              key={module.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ 
                left: `${module.position.x}%`, 
                top: `${module.position.y}%`,
                animationDelay: `${index * 100}ms`
              }}
            >
              <div
                className={`
                  chirp-node cursor-pointer animate-slide-up
                  ${module.completed 
                    ? 'bg-gradient-primary text-white shadow-glow animate-sparkle' 
                    : module.current 
                    ? 'bg-gradient-secondary text-white animate-pulse' 
                    : module.locked 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60' 
                    : 'bg-accent text-accent-foreground hover:bg-accent/80'
                  }
                `}
                onClick={() => handleModuleClick(module)}
              >
                <module.icon className="w-6 h-6" />
              </div>
              
              {/* Module label */}
              <div className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2">
                <span className="text-xs font-medium text-card-foreground bg-card/90 px-3 py-1 rounded-full whitespace-nowrap border border-muted">
                  {module.title}
                </span>
              </div>

              {/* Current module indicator */}
              {module.current && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                  <BirdMascot 
                    size="small" 
                    animation="bounce"
                    showBubble
                    message="Let's learn!"
                  />
                </div>
              )}

              {/* Completion sparkles */}
              {module.completed && (
                <div className="absolute -top-2 -right-2 text-yellow-400 animate-pulse">
                  ✨
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Motivational Message */}
        <ChirpCard className="mt-8 text-center animate-slide-up">
          <h2 className="text-lg font-bold text-card-foreground mb-2">
            {stats.completedModules > 0 ? "Keep up the great work! 🌟" : "Ready to start your journey? 🚀"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.completedModules > 0 
              ? `You've completed ${stats.completedModules} lessons. You're doing amazing!`
              : "Tap any unlocked lesson to begin practicing conversations."
            }
          </p>
        </ChirpCard>
      </div>

      {/* Floating Companion */}
      <div className="floating-companion">
        <BirdMascot 
          size="medium"
          showBubble
          message="Choose a lesson!"
        />
      </div>
    </div>
  );
}