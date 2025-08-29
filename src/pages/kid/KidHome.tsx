import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpCard } from '@/components/ChirpCard';
import { Coins, Flame, Heart, Home, School, UtensilsCrossed, Gamepad2 } from 'lucide-react';
import forestPathBg from '@/assets/forest-path-bg.png';

interface LearningNode {
  id: string;
  title: string;
  icon: any;
  position: { x: number; y: number };
  completed: boolean;
  current: boolean;
  locked: boolean;
}

export default function KidHome() {
  const navigate = useNavigate();
  const [stats] = useState({
    coins: 125,
    streak: 7,
    hearts: 5
  });

  const learningNodes: LearningNode[] = [
    {
      id: 'home',
      title: 'At Home',
      icon: Home,
      position: { x: 50, y: 85 },
      completed: true,
      current: false,
      locked: false
    },
    {
      id: 'school',
      title: 'At School',
      icon: School,
      position: { x: 30, y: 65 },
      completed: false,
      current: true,
      locked: false
    },
    {
      id: 'restaurant',
      title: 'Restaurant',
      icon: UtensilsCrossed,
      position: { x: 70, y: 45 },
      completed: false,
      current: false,
      locked: true
    },
    {
      id: 'playground',
      title: 'Playground',
      icon: Gamepad2,
      position: { x: 40, y: 25 },
      completed: false,
      current: false,
      locked: true
    }
  ];

  const handleNodeClick = (node: LearningNode) => {
    if (!node.locked) {
      console.log(`Starting ${node.title} scenario`);
      navigate('/kid/scenario');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${forestPathBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
      </div>

      {/* Stats Bar */}
      <div className="relative z-10 pt-safe-top p-4">
        <ChirpCard className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Coins className="w-6 h-6 text-highlight" />
              <span className="font-bold text-lg">{stats.coins}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Flame className="w-6 h-6 text-orange-400" />
              <span className="font-bold text-lg">{stats.streak}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-red-400" />
              <span className="font-bold text-lg">{stats.hearts}</span>
            </div>
          </div>
        </ChirpCard>

        {/* Learning Path */}
        <div className="relative h-96 w-full">
          {learningNodes.map((node) => (
            <div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-slide-up"
              style={{ 
                left: `${node.position.x}%`, 
                top: `${node.position.y}%` 
              }}
            >
              <div
                className={`
                  chirp-node cursor-pointer
                  ${node.completed 
                    ? 'bg-gradient-primary text-white shadow-glow' 
                    : node.current 
                    ? 'bg-gradient-secondary text-white animate-sparkle' 
                    : node.locked 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                    : 'bg-accent text-accent-foreground'
                  }
                `}
                onClick={() => handleNodeClick(node)}
              >
                <node.icon className="w-8 h-8" />
              </div>
              
              {/* Node label */}
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2">
                <span className="text-sm font-medium text-card-foreground bg-card/80 px-2 py-1 rounded-lg whitespace-nowrap">
                  {node.title}
                </span>
              </div>

              {/* Current node indicator */}
              {node.current && (
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                  <BirdMascot 
                    size="small" 
                    animation="bounce"
                    showBubble
                    message="Let's continue!"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Welcome Message */}
        <ChirpCard className="mt-8 text-center">
          <h2 className="text-xl font-bold text-card-foreground mb-2">
            Great job practicing! 🎉
          </h2>
          <p className="text-muted-foreground">
            Tap a lesson to continue your conversation journey
          </p>
        </ChirpCard>
      </div>

      {/* Floating Companion */}
      <div className="floating-companion">
        <BirdMascot 
          size="medium"
          showBubble
          message="You're doing amazing!"
        />
      </div>
    </div>
  );
}