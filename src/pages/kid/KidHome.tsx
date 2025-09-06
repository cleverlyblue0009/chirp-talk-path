import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpCard } from '@/components/ChirpCard';
import { GameConfiguration } from '@/types/assessment';
import { GameConfigurationManager } from '@/utils/gameConfiguration';
import { Coins, Flame, Heart, Home, School, UtensilsCrossed, Gamepad2, Bird, Store, Stethoscope, Lock } from 'lucide-react';
import { ChirpButton } from '@/components/ChirpButton';
import forestPathBg from '@/assets/forest-path-bg.png';

interface LearningNode {
  id: string;
  title: string;
  icon: any;
  position: { x: number; y: number };
  completed: boolean;
  current: boolean;
  locked: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  recommended: boolean;
  supportLevel: 'minimal' | 'moderate' | 'high';
}

export default function KidHome() {
  const navigate = useNavigate();
  const [gameConfig, setGameConfig] = useState<GameConfiguration | null>(null);
  const [stats, setStats] = useState({
    coins: 125,
    streak: 7,
    hearts: 5
  });

  useEffect(() => {
    // Load game configuration based on assessment results
    const config = GameConfigurationManager.getCurrentGameState();
    setGameConfig(config);
    
    // Update stats from game configuration
    setStats({
      coins: 125 + Math.round(config.currentScore / 2), // Base coins + assessment bonus
      streak: config.streak,
      hearts: config.lives
    });
  }, []);

  const getIconForScenario = (scenarioId: string) => {
    const iconMap: Record<string, any> = {
      home: Home,
      school: School,
      restaurant: UtensilsCrossed,
      playground: Gamepad2,
      store: Store,
      doctor: Stethoscope
    };
    return iconMap[scenarioId] || Home;
  };

  const getPositionForScenario = (index: number, total: number) => {
    // Create a curved path layout
    const positions = [
      { x: 50, y: 85 }, // Start at bottom center
      { x: 30, y: 65 }, // Move up and left
      { x: 70, y: 45 }, // Move up and right
      { x: 40, y: 25 }, // Move up and left
      { x: 60, y: 15 }, // Top right
      { x: 20, y: 35 }  // Additional positions
    ];
    return positions[index] || { x: 50, y: 50 };
  };

  const learningNodes: LearningNode[] = gameConfig ? 
    gameConfig.availableScenarios.map((scenario, index) => ({
      id: scenario.id,
      title: scenario.title,
      icon: getIconForScenario(scenario.id),
      position: getPositionForScenario(index, gameConfig.availableScenarios.length),
      completed: false, // TODO: Track completion status
      current: scenario.recommended,
      locked: !scenario.unlocked,
      difficulty: scenario.difficulty,
      recommended: scenario.recommended,
      supportLevel: scenario.supportLevel
    })) : [
      // Fallback nodes if no game config loaded
      {
        id: 'home',
        title: 'At Home',
        icon: Home,
        position: { x: 50, y: 85 },
        completed: false,
        current: true,
        locked: false,
        difficulty: 'easy' as const,
        recommended: true,
        supportLevel: 'high' as const
      }
    ];

  const handleNodeClick = (node: LearningNode) => {
    if (!node.locked) {
      console.log(`Opening ${node.title} sub-map`);
      navigate(`/kid/submap?scenario=${node.id}&difficulty=${node.difficulty}&support=${node.supportLevel}`);
    }
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSupportIcon = (supportLevel: 'minimal' | 'moderate' | 'high') => {
    const dots = supportLevel === 'high' ? 3 : supportLevel === 'moderate' ? 2 : 1;
    return '•'.repeat(dots);
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
              <div className="relative">
                <div
                  className={`
                    chirp-node cursor-pointer relative
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
                  {node.locked ? (
                    <Lock className="w-8 h-8" />
                  ) : (
                    <node.icon className="w-8 h-8" />
                  )}
                  
                  {/* Difficulty indicator */}
                  {!node.locked && (
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getDifficultyColor(node.difficulty)} bg-current`}></div>
                  )}
                </div>
                
                {/* Recommended badge */}
                {node.recommended && !node.locked && (
                  <div className="absolute -top-2 -left-2 bg-highlight text-highlight-foreground text-xs px-1 rounded-full animate-pulse">
                    ⭐
                  </div>
                )}
              </div>
              
              {/* Node label */}
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2">
                <div className="text-center">
                  <span className="text-sm font-medium text-card-foreground bg-card/80 px-2 py-1 rounded-lg whitespace-nowrap block">
                    {node.title}
                  </span>
                  {!node.locked && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className={`capitalize ${getDifficultyColor(node.difficulty)}`}>
                        {node.difficulty}
                      </span>
                      <span className="mx-1">•</span>
                      <span title={`Support: ${node.supportLevel}`}>
                        {getSupportIcon(node.supportLevel)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Current node indicator */}
              {node.current && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                  <BirdMascot 
                    size="small" 
                    animation="bounce"
                    showBubble
                    message={node.recommended ? "Perfect for you!" : "Let's continue!"}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Welcome Message */}
        <ChirpCard className="mt-8 text-center">
          {gameConfig ? (
            <div>
              <h2 className="text-xl font-bold text-card-foreground mb-2">
                Welcome back, {gameConfig.playerLevel === 'beginner' ? 'Explorer' : 
                              gameConfig.playerLevel === 'intermediate' ? 'Champion' : 'Superstar'}! 🎉
              </h2>
              <p className="text-muted-foreground mb-3">
                {gameConfig.playerLevel === 'beginner' && 'Start with easy conversations to build confidence'}
                {gameConfig.playerLevel === 'intermediate' && 'Ready for some exciting conversation challenges'}
                {gameConfig.playerLevel === 'advanced' && 'Time for advanced communication adventures'}
              </p>
              <div className="bg-secondary/20 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Your Level:</span>
                  <span className="font-medium capitalize text-primary">{gameConfig.playerLevel}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">Assessment Score:</span>
                  <span className="font-medium text-highlight">{gameConfig.currentScore}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-card-foreground mb-2">
                Ready to start learning? 🎆
              </h2>
              <p className="text-muted-foreground mb-3">
                Take the assessment first to unlock personalized lessons!
              </p>
              <ChirpButton 
                variant="primary"
                onClick={() => navigate('/kid/assessment')}
                className="animate-bounce-gentle"
              >
                Take Assessment 🎯
              </ChirpButton>
            </div>
          )}
        </ChirpCard>
      </div>

      {/* Floating Companion Nest Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => navigate('/kid/companion-nest')}
          className="chirp-node bg-gradient-secondary text-white shadow-glow hover:scale-110 animate-float"
        >
          <Bird className="w-6 h-6" />
        </button>
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