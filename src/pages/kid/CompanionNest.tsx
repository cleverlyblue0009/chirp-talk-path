import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { ArrowLeft, Lock, Palette, Crown, Glasses } from 'lucide-react';

interface Companion {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  selected: boolean;
  color: string;
  personality: string;
}

interface Accessory {
  id: string;
  name: string;
  icon: any;
  unlocked: boolean;
  equipped: boolean;
  type: 'hat' | 'glasses' | 'color';
}

export default function CompanionNest() {
  const navigate = useNavigate();
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);

  const companions: Companion[] = [
    {
      id: 'chirpy',
      name: 'Chirpy',
      description: 'Your first friend! Always cheerful and ready to help you learn.',
      unlocked: true,
      selected: true,
      color: 'blue',
      personality: 'Cheerful & Encouraging'
    },
    {
      id: 'wise-owl',
      name: 'Wise Owl',
      description: 'The smartest bird around. Loves teaching new words and phrases.',
      unlocked: true,
      selected: false,
      color: 'brown',
      personality: 'Wise & Patient'
    },
    {
      id: 'peppy-pigeon',
      name: 'Peppy Pigeon',
      description: 'Super energetic and loves celebrating your achievements!',
      unlocked: false,
      selected: false,
      color: 'gray',
      personality: 'Energetic & Fun'
    },
    {
      id: 'calm-canary',
      name: 'Calm Canary',
      description: 'Perfect for when you need extra patience and gentle guidance.',
      unlocked: false,
      selected: false,
      color: 'yellow',
      personality: 'Gentle & Calming'
    }
  ];

  const accessories: Accessory[] = [
    {
      id: 'golden-crown',
      name: 'Golden Crown',
      icon: Crown,
      unlocked: true,
      equipped: false,
      type: 'hat'
    },
    {
      id: 'cool-glasses',
      name: 'Cool Glasses',
      icon: Glasses,
      unlocked: true,
      equipped: false,
      type: 'glasses'
    },
    {
      id: 'rainbow-color',
      name: 'Rainbow Colors',
      icon: Palette,
      unlocked: false,
      equipped: false,
      type: 'color'
    }
  ];

  const handleCompanionSelect = (companionId: string) => {
    if (companions.find(c => c.id === companionId)?.unlocked) {
      setSelectedCompanion(companionId);
      setShowCustomization(true);
    }
  };

  const selectCompanion = (companionId: string) => {
    // Logic to set as active companion
    console.log(`Selected ${companionId} as active companion`);
    navigate('/kid/home');
  };

  if (showCustomization && selectedCompanion) {
    const companion = companions.find(c => c.id === selectedCompanion);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 animate-slide-up">
            <ChirpButton 
              variant="secondary" 
              size="small" 
              icon={ArrowLeft}
              onClick={() => setShowCustomization(false)}
            >
              Back
            </ChirpButton>
            <h1 className="font-bold text-lg text-card-foreground">Customize {companion?.name}</h1>
            <div className="w-16"></div>
          </div>

          {/* Companion Preview */}
          <ChirpCard className="mb-6 text-center animate-slide-up">
            <div className="mb-4">
              <BirdMascot 
                size="large" 
                animation="float"
                className="mx-auto"
              />
            </div>
            <h3 className="font-bold text-lg text-card-foreground mb-1">{companion?.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">{companion?.personality}</p>
            <p className="text-xs text-muted-foreground">{companion?.description}</p>
          </ChirpCard>

          {/* Accessories */}
          <ChirpCard className="mb-6 animate-slide-up">
            <h3 className="font-bold text-card-foreground mb-4">Accessories</h3>
            <div className="grid grid-cols-3 gap-3">
              {accessories.map((accessory) => (
                <div
                  key={accessory.id}
                  className={`
                    relative p-4 rounded-2xl border-2 transition-all cursor-pointer
                    ${accessory.unlocked 
                      ? 'bg-accent/20 border-accent hover:bg-accent/30' 
                      : 'bg-muted/20 border-muted'
                    }
                    ${accessory.equipped ? 'ring-2 ring-primary shadow-glow' : ''}
                  `}
                >
                  <div className="text-center">
                    <accessory.icon className={`w-6 h-6 mx-auto mb-2 ${accessory.unlocked ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-medium text-card-foreground">{accessory.name}</p>
                  </div>
                  {!accessory.unlocked && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ChirpCard>

          {/* Action Buttons */}
          <div className="space-y-3 animate-slide-up">
            <ChirpButton 
              variant="primary" 
              onClick={() => selectCompanion(selectedCompanion)}
              className="w-full"
            >
              Choose {companion?.name}
            </ChirpButton>
            <ChirpButton 
              variant="secondary" 
              onClick={() => setShowCustomization(false)}
              className="w-full"
            >
              Keep Looking
            </ChirpButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <ChirpButton 
            variant="secondary" 
            size="small" 
            icon={ArrowLeft}
            onClick={() => navigate('/kid/home')}
          >
            Back
          </ChirpButton>
          <h1 className="font-bold text-lg text-card-foreground">Companion Nest</h1>
          <div className="w-16"></div>
        </div>

        {/* Description */}
        <ChirpCard className="mb-6 text-center animate-slide-up">
          <h2 className="text-lg font-bold text-card-foreground mb-2">Choose Your Learning Buddy! 🐦</h2>
          <p className="text-sm text-muted-foreground">
            Each companion has their own personality to help you learn in different ways.
          </p>
        </ChirpCard>

        {/* Companions Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {companions.map((companion, index) => (
            <ChirpCard
              key={companion.id}
              variant={companion.unlocked ? "interactive" : "default"}
              className={`
                text-center transition-all duration-300
                ${companion.unlocked ? 'cursor-pointer' : 'opacity-60'}
                ${companion.selected ? 'ring-2 ring-primary shadow-glow' : ''}
                animate-slide-up
              `}
              onClick={() => companion.unlocked && handleCompanionSelect(companion.id)}
            >
              <div className="relative mb-3">
                <BirdMascot 
                  size="medium" 
                  animation={companion.selected ? "bounce" : "float"}
                  className="mx-auto"
                />
                {!companion.unlocked && (
                  <div className="absolute top-0 right-0 bg-muted rounded-full p-1">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                {companion.selected && (
                  <div className="absolute -top-1 -right-1 text-yellow-400 animate-pulse">
                    ⭐
                  </div>
                )}
              </div>
              
              <h3 className="font-bold text-sm text-card-foreground mb-1">{companion.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{companion.personality}</p>
              
              {companion.unlocked ? (
                <div className="text-xs text-primary font-medium">
                  {companion.selected ? 'Active' : 'Tap to select'}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Unlock by completing more lessons
                </div>
              )}
            </ChirpCard>
          ))}
        </div>

        {/* Progress Message */}
        <ChirpCard className="text-center animate-slide-up">
          <p className="text-sm text-muted-foreground">
            Complete more lessons to unlock new companions and accessories! 
          </p>
          <div className="mt-3 flex justify-center space-x-1">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full ${i <= 2 ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </ChirpCard>
      </div>

      {/* Floating Helper */}
      <div className="floating-companion">
        <BirdMascot 
          size="medium"
          showBubble
          message="Pick your favorite!"
        />
      </div>
    </div>
  );
}