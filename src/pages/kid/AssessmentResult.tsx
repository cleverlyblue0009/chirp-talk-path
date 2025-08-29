import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { Sparkles, Trophy, Star } from 'lucide-react';

export default function AssessmentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const level = searchParams.get('level') || 'Beginner';
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const levelInfo = {
    'Beginner': {
      icon: Star,
      color: 'text-secondary',
      description: "Perfect! We'll start with fun, easy conversations to build your confidence.",
      startScenario: 'home'
    },
    'Intermediate': {
      icon: Trophy,
      color: 'text-primary',
      description: "Great job! You're ready for some exciting conversation challenges.",
      startScenario: 'school'
    },
    'Advanced': {
      icon: Sparkles,
      color: 'text-accent',
      description: "Wow! You're a conversation superstar! Let's practice complex scenarios.",
      startScenario: 'restaurant'
    }
  };

  const currentLevel = levelInfo[level as keyof typeof levelInfo];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4 flex items-center justify-center relative overflow-hidden">
      
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md mx-auto relative z-10">
        {/* Main Result Card */}
        <ChirpCard className="text-center mb-6 animate-scale-in">
          <div className="mb-6">
            <BirdMascot 
              size="large" 
              animation="sparkle"
              className="mx-auto mb-4"
            />
          </div>

          <div className="space-y-4">
            {/* Level Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-primary text-white px-4 py-2 rounded-full animate-pulse">
              <currentLevel.icon className={`w-5 h-5 ${currentLevel.color}`} />
              <span className="font-bold">{level} Level</span>
            </div>

            <h1 className="text-2xl font-bold text-card-foreground">
              Fantastic Job! 🎉
            </h1>

            <p className="text-muted-foreground">
              {currentLevel.description}
            </p>

            {/* Achievement Stats */}
            <div className="bg-secondary/20 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Assessment Complete</span>
                <span className="text-sm font-medium text-primary">✓</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Starting Level</span>
                <span className="text-sm font-medium text-card-foreground">{level}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Chirp Coins Earned</span>
                <span className="text-sm font-medium text-highlight">+50 🪙</span>
              </div>
            </div>
          </div>
        </ChirpCard>

        {/* Next Steps Card */}
        <ChirpCard className="mb-6 animate-slide-up">
          <h3 className="font-bold text-card-foreground mb-3">What's Next?</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Start Your Journey</p>
                <p className="text-xs text-muted-foreground">Begin with scenarios perfect for your level</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Collect Companions</p>
                <p className="text-xs text-muted-foreground">Unlock new bird friends as you progress</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Have Fun!</p>
                <p className="text-xs text-muted-foreground">Practice conversations at your own pace</p>
              </div>
            </div>
          </div>
        </ChirpCard>

        {/* Action Buttons */}
        <div className="space-y-3 animate-slide-up">
          <ChirpButton 
            variant="primary" 
            onClick={() => navigate('/kid/home')}
            className="w-full animate-bounce-gentle"
          >
            Start My Adventure! 🚀
          </ChirpButton>
          
          <ChirpButton 
            variant="secondary" 
            onClick={() => navigate('/kid/companion-nest')}
            className="w-full"
          >
            Meet My Companions First
          </ChirpButton>
        </div>

        {/* Motivational Message */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground italic">
            "Every conversation is a step forward. You're already amazing!" - Chirpy 🐦
          </p>
        </div>
      </div>

      {/* Floating Success Bird */}
      <div className="fixed bottom-4 right-4 z-20">
        <BirdMascot 
          size="medium"
          animation="bounce"
          showBubble
          message="You did it!"
        />
      </div>
    </div>
  );
}