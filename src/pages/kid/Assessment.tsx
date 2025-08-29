import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Camera, CameraOff } from 'lucide-react';

interface AssessmentQuestion {
  id: string;
  type: 'mcq' | 'interaction';
  question: string;
  options?: string[];
  correctAnswer?: number;
}

export default function Assessment() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  const questions: AssessmentQuestion[] = [
    {
      id: '1',
      type: 'mcq',
      question: "When someone says 'Hi!' to you, what do you usually do?",
      options: [
        "Say 'Hi!' back",
        "Smile and wave",
        "Look away",
        "I'm not sure"
      ]
    },
    {
      id: '2',
      type: 'interaction',
      question: "Hi there! Can you tell me your name and one thing you like to do?"
    },
    {
      id: '3',
      type: 'mcq',
      question: "If you need help with something, what's the best way to ask?",
      options: [
        "Just wait until someone notices",
        "Say 'Excuse me, can you help me?'",
        "Point at what you need",
        "Ask later"
      ]
    },
    {
      id: '4',
      type: 'interaction',
      question: "Let's practice! Can you ask me for help getting a book from a high shelf?"
    },
    {
      id: '5',
      type: 'mcq',
      question: "When talking with friends, it's good to:",
      options: [
        "Only talk about what I like",
        "Listen and ask questions too",
        "Stay quiet most of the time",
        "Talk very fast"
      ]
    }
  ];

  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);

    setTimeout(() => {
      nextQuestion();
    }, 1000);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsRecording(false);
    } else {
      // Assessment complete
      completeAssessment();
    }
  };

  const completeAssessment = () => {
    // Calculate level based on answers
    const score = answers.reduce((total, answer) => total + (answer === 1 ? 1 : 0), 0);
    const level = score >= 4 ? 'Advanced' : score >= 2 ? 'Intermediate' : 'Beginner';
    
    navigate(`/kid/assessment-result?level=${level}`);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Start recording logic
      setTimeout(() => {
        setIsRecording(false);
        nextQuestion();
      }, 3000); // Auto-stop after 3 seconds for demo
    }
  };

  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <ChirpCard className="text-center animate-scale-in">
            <div className="mb-6">
              <BirdMascot 
                size="large" 
                animation="bounce"
                className="mx-auto mb-4"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-card-foreground mb-4">
              Let's Play a Game! 🎮
            </h1>
            
            <div className="space-y-4 text-left mb-6">
              <p className="text-sm text-muted-foreground">
                Hi! I'm Chirpy, and I want to be your conversation buddy.
              </p>
              <p className="text-sm text-muted-foreground">
                Let's play a short conversation game so I can learn the best way to help you!
              </p>
              <p className="text-sm text-muted-foreground">
                There are no wrong answers - just be yourself! 😊
              </p>
            </div>

            <div className="space-y-3">
              <ChirpButton 
                variant="primary" 
                onClick={() => setShowIntro(false)}
                className="w-full animate-bounce-gentle"
              >
                Let's Start! 🚀
              </ChirpButton>
              <ChirpButton 
                variant="secondary" 
                onClick={() => navigate('/kid/home')}
                className="w-full"
              >
                Maybe Later
              </ChirpButton>
            </div>
          </ChirpCard>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-glow/20 via-secondary/10 to-accent/20 p-4">
      <div className="max-w-md mx-auto">
        {/* Progress Header */}
        <div className="mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-card-foreground">Conversation Game</h2>
            <span className="text-sm text-muted-foreground">
              {currentQuestion + 1} of {totalQuestions}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Section */}
        <ChirpCard className="mb-6 animate-slide-up">
          <div className="text-center">
            <div className="mb-4">
              <BirdMascot 
                size="large" 
                animation="wiggle"
                className="mx-auto mb-4"
                showBubble
                message="You're doing great!"
              />
            </div>
            
            <div className="bg-secondary/20 rounded-2xl p-4">
              <h3 className="font-semibold text-secondary-foreground mb-2">
                Chirpy asks:
              </h3>
              <p className="text-lg text-card-foreground">{currentQ.question}</p>
            </div>
          </div>
        </ChirpCard>

        {/* Answer Section */}
        {currentQ.type === 'mcq' && currentQ.options ? (
          <div className="space-y-3 mb-6 animate-slide-up">
            {currentQ.options.map((option, index) => (
              <ChirpCard
                key={index}
                variant="interactive"
                onClick={() => handleAnswerSelect(index)}
                className={`
                  transition-all duration-300
                  ${selectedAnswer === index ? 'ring-2 ring-primary shadow-glow bg-primary/10' : ''}
                `}
              >
                <p className="text-center font-medium text-card-foreground">{option}</p>
              </ChirpCard>
            ))}
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {/* Interaction Mode */}
            <ChirpCard>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Tap the button and speak your answer:
                </p>
                
                <div className="space-y-3">
                  <ChirpButton
                    variant={isRecording ? 'secondary' : 'primary'}
                    icon={isRecording ? MicOff : Mic}
                    onClick={toggleRecording}
                    className={`w-full ${isRecording ? 'animate-pulse' : ''}`}
                  >
                    {isRecording ? 'Recording... Tap to Stop' : 'Start Speaking'}
                  </ChirpButton>
                  
                  <ChirpButton
                    variant="secondary"
                    onClick={nextQuestion}
                    className="w-full"
                  >
                    Skip This Question
                  </ChirpButton>
                </div>

                {isRecording && (
                  <div className="mt-4 flex justify-center">
                    <div className="flex space-x-1">
                      {[1, 2, 3].map((i) => (
                        <div 
                          key={i}
                          className="w-2 h-8 bg-primary rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ChirpCard>
          </div>
        )}

        {/* Encouragement */}
        <ChirpCard className="text-center animate-slide-up">
          <p className="text-sm text-muted-foreground">
            {currentQuestion < 2 
              ? "Great start! Keep going! 🌟" 
              : currentQuestion < 4 
              ? "You're doing amazing! Almost done! 🎉"
              : "Last question - you've got this! 🚀"
            }
          </p>
        </ChirpCard>
      </div>
    </div>
  );
}