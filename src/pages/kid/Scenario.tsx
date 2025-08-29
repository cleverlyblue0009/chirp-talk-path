import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Home, ArrowLeft, Coins, Trophy } from 'lucide-react';

interface ScenarioQuestion {
  id: string;
  character: string;
  message: string;
  options: string[];
  correctAnswer: number;
}

export default function Scenario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('module') || 'greetings';
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const moduleData: Record<string, any> = {
    greetings: {
      title: "Module 1: Family Greetings",
      character: "Mom",
      background: "Practice greeting your family members warmly.",
      totalQuestions: 2
    },
    'sharing-day': {
      title: "Module 2: Sharing Your Day",
      character: "Dad",
      background: "Share what happened at school today.",
      totalQuestions: 2
    },
    'asking-help': {
      title: "Module 3: Asking for Help",
      character: "Sister",
      background: "Learn to ask for help when you need it.",
      totalQuestions: 2
    }
  };

  const currentModule = moduleData[moduleId] || moduleData.greetings;

  const questions: ScenarioQuestion[] = [
    {
      id: '1',
      character: 'Mom',
      message: "Hi sweetie! How was school today?",
      options: [
        "Good!",
        "It was really fun! We learned about animals in science class.",
        "Fine."
      ],
      correctAnswer: 1
    },
    {
      id: '2',
      character: 'Mom',
      message: "That sounds wonderful! What was your favorite animal you learned about?",
      options: [
        "I don't know.",
        "We learned about dolphins! They're really smart and can talk to each other.",
        "Animals are okay."
      ],
      correctAnswer: 1
    }
  ];

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / currentModule.totalQuestions) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    if (answerIndex === currentQ.correctAnswer) {
      setScore(score + 1);
      const coins = 10;
      setCoinsEarned(coinsEarned + coins);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 1500);
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        // Module complete
        navigate('/kid/submap');
      }
    }, 2000);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-primary-glow/20 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <ChirpButton 
            variant="secondary" 
            size="small" 
            icon={ArrowLeft}
            onClick={() => navigate('/kid/submap')}
          >
            Back
          </ChirpButton>
          <div className="text-center">
            <h2 className="font-bold text-lg">{currentModule.title}</h2>
            <p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {currentModule.totalQuestions}</p>
          </div>
          <div className="w-20"> {/* Spacer for centering */}</div>
        </div>

        {/* Progress */}
        <ChirpCard className="mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </ChirpCard>

        {/* Character Section */}
        <ChirpCard className="mb-6 animate-slide-up">
          <div className="text-center">
            <div className="mb-4">
              <BirdMascot 
                size="large" 
                animation="bounce"
                className="mx-auto mb-4"
              />
            </div>
            <div className="bg-secondary/20 rounded-2xl p-4">
              <h3 className="font-semibold text-secondary-foreground mb-2">
                {currentQ.character} says:
              </h3>
              <p className="text-lg">{currentQ.message}</p>
            </div>
          </div>
        </ChirpCard>

        {/* Answer Options */}
        <div className="space-y-4 mb-6 animate-slide-up">
          {currentQ.options.map((option, index) => (
            <ChirpCard
              key={index}
              variant="interactive"
              onClick={() => handleAnswerSelect(index)}
              className={`
                ${showFeedback && selectedAnswer === index 
                  ? (index === currentQ.correctAnswer 
                    ? 'bg-primary-glow/30 border-primary' 
                    : 'bg-destructive/20 border-destructive')
                  : ''
                }
                ${showFeedback && index === currentQ.correctAnswer && selectedAnswer !== index
                  ? 'bg-primary-glow/20 border-primary'
                  : ''
                }
              `}
            >
              <p className="text-center font-medium">{option}</p>
            </ChirpCard>
          ))}
        </div>

        {/* Recording Option */}
        <ChirpCard className="mb-6 animate-slide-up">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Or say your answer out loud:
            </p>
            <ChirpButton
              variant={isRecording ? 'highlight' : 'accent'}
              icon={isRecording ? MicOff : Mic}
              onClick={toggleRecording}
              className={`${isRecording ? 'animate-pulse' : ''}`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </ChirpButton>
          </div>
        </ChirpCard>

        {/* Feedback */}
        {showFeedback && (
          <ChirpCard className="animate-slide-up">
            <div className="text-center">
              {selectedAnswer === currentQ.correctAnswer ? (
                <div>
                  <div className="text-2xl mb-2">🎉</div>
                  <h3 className="font-bold text-primary mb-2">Great job!</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    That's a wonderful way to share about your day!
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-highlight-foreground">
                    <Coins className="w-4 h-4" />
                    <span className="text-sm font-bold">+10 coins earned!</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">🤔</div>
                  <h3 className="font-bold text-accent-foreground mb-2">Let's try a different approach</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Remember, it's nice to share details about your day. Try: "{currentQ.options[currentQ.correctAnswer]}"
                  </p>
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <BirdMascot 
                      size="small"
                      animation="wiggle"
                      showBubble
                      message={`"${currentQ.options[currentQ.correctAnswer]}"`}
                    />
                  </div>
                </div>
              )}
            </div>
          </ChirpCard>
        )}

        {/* Reward Animation */}
        {showReward && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-gradient-primary text-white p-6 rounded-full animate-scale-in shadow-glow">
              <div className="text-center">
                <Coins className="w-8 h-8 mx-auto mb-2" />
                <div className="font-bold text-lg">+10 Coins!</div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Companion */}
        <div className="floating-companion">
          <BirdMascot 
            size="medium"
            showBubble
            message="You're doing great!"
          />
        </div>
      </div>
    </div>
  );
}