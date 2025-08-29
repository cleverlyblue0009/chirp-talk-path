import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Home, ArrowLeft } from 'lucide-react';

interface ScenarioQuestion {
  id: string;
  character: string;
  message: string;
  options: string[];
  correctAnswer: number;
}

export default function Scenario() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const scenarioData = {
    title: "At Home with Family",
    character: "Mom",
    background: "You're in the kitchen with your mom. She's making dinner.",
    totalQuestions: 5
  };

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
  const progress = ((currentQuestion + 1) / scenarioData.totalQuestions) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    if (answerIndex === currentQ.correctAnswer) {
      setScore(score + 1);
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        // Scenario complete
        navigate('/kid/home');
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
            onClick={() => navigate('/kid/home')}
          >
            Back
          </ChirpButton>
          <div className="text-center">
            <h2 className="font-bold text-lg">{scenarioData.title}</h2>
            <p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {scenarioData.totalQuestions}</p>
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
                  <p className="text-sm text-muted-foreground">
                    That's a wonderful way to share about your day!
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">🤔</div>
                  <h3 className="font-bold text-accent-foreground mb-2">Let's try a different approach</h3>
                  <p className="text-sm text-muted-foreground">
                    Remember, it's nice to share details about your day. Try: "{currentQ.options[currentQ.correctAnswer]}"
                  </p>
                </div>
              )}
            </div>
          </ChirpCard>
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