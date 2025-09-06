import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { AssessmentResults } from '@/types/assessment';
import { Sparkles, Trophy, Star, Brain, Eye, MessageCircle, Heart, TrendingUp } from 'lucide-react';

export default function AssessmentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fallbackLevel = searchParams.get('level') || 'beginner';
  const fallbackScore = parseInt(searchParams.get('score') || '50');
  const [showConfetti, setShowConfetti] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);

  useEffect(() => {
    // Load assessment results from localStorage
    const savedResults = localStorage.getItem('chirp_assessment_results');
    if (savedResults) {
      try {
        const results: AssessmentResults = JSON.parse(savedResults);
        setAssessmentResults(results);
      } catch (error) {
        console.error('Failed to parse assessment results:', error);
      }
    }
    
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Use real results or fallback
  const level = assessmentResults?.recommendedLevel || fallbackLevel;
  const overallScore = assessmentResults?.overallScore || fallbackScore;
  const categoryScores = assessmentResults?.categoryScores;
  const strengths = assessmentResults ? 
    Object.values(assessmentResults.categoryScores).flatMap(cat => cat.strengths) : [];
  const improvements = assessmentResults ? 
    Object.values(assessmentResults.categoryScores).flatMap(cat => cat.improvementAreas) : [];

  const levelInfo = {
    'beginner': {
      icon: Star,
      color: 'text-secondary',
      title: 'Beginner Explorer',
      description: "Perfect! We'll start with fun, easy conversations to build your confidence.",
      startScenario: 'home'
    },
    'intermediate': {
      icon: Trophy,
      color: 'text-primary', 
      title: 'Conversation Champion',
      description: "Great job! You're ready for some exciting conversation challenges.",
      startScenario: 'school'
    },
    'advanced': {
      icon: Sparkles,
      color: 'text-accent',
      title: 'Communication Superstar',
      description: "Wow! You're a conversation superstar! Let's practice complex scenarios.",
      startScenario: 'restaurant'
    }
  };

  const currentLevel = levelInfo[level as keyof typeof levelInfo] || levelInfo.beginner;

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
              <currentLevel.icon className="w-5 h-5" />
              <span className="font-bold">{currentLevel.title}</span>
            </div>

            <h1 className="text-2xl font-bold text-card-foreground">
              Fantastic Job! 🎉
            </h1>

            <p className="text-muted-foreground mb-4">
              {currentLevel.description}
            </p>

            {/* Overall Score */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{overallScore}%</div>
                <div className="text-sm text-muted-foreground">Overall Communication Score</div>
              </div>
            </div>

            {/* Category Scores */}
            {categoryScores && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-sm font-medium text-blue-700">Verbal</div>
                  <div className="text-lg font-bold text-blue-600">{categoryScores.verbalCommunication.score}%</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <Eye className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <div className="text-sm font-medium text-green-700">Non-verbal</div>
                  <div className="text-lg font-bold text-green-600">{categoryScores.nonVerbalCommunication.score}%</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <Brain className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="text-sm font-medium text-purple-700">Social</div>
                  <div className="text-lg font-bold text-purple-600">{categoryScores.socialInteraction.score}%</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <Heart className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <div className="text-sm font-medium text-orange-700">Comfort</div>
                  <div className="text-lg font-bold text-orange-600">{categoryScores.comfortLevel.score}%</div>
                </div>
              </div>
            )}

            {/* Achievement Stats */}
            <div className="bg-secondary/20 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Assessment Complete</span>
                <span className="text-sm font-medium text-primary">✓</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recommended Level</span>
                <span className="text-sm font-medium text-card-foreground capitalize">{level}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Confidence Score</span>
                <span className="text-sm font-medium text-highlight">{assessmentResults?.confidence || 85}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Chirp Coins Earned</span>
                <span className="text-sm font-medium text-highlight">+{Math.round(overallScore / 2)} 🪙</span>
              </div>
            </div>
          </div>
        </ChirpCard>

        {/* Strengths and Improvements */}
        {(strengths.length > 0 || improvements.length > 0) && (
          <ChirpCard className="mb-6 animate-slide-up">
            <h3 className="font-bold text-card-foreground mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Your Communication Profile
            </h3>
            
            {strengths.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-primary mb-2">✨ Your Strengths:</h4>
                <div className="flex flex-wrap gap-2">
                  {strengths.slice(0, 3).map((strength, index) => (
                    <span key={index} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {improvements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-secondary mb-2">🎯 Areas to Explore:</h4>
                <div className="flex flex-wrap gap-2">
                  {improvements.slice(0, 3).map((improvement, index) => (
                    <span key={index} className="bg-secondary/10 text-secondary px-2 py-1 rounded-full text-xs">
                      {improvement}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ChirpCard>
        )}

        {/* Next Steps Card */}
        <ChirpCard className="mb-6 animate-slide-up">
          <h3 className="font-bold text-card-foreground mb-3">What's Next?</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Start Your Journey</p>
                <p className="text-xs text-muted-foreground">Begin with scenarios perfect for your {level} level</p>
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