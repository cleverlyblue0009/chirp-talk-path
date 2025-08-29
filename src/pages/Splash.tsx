import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BirdMascot } from '@/components/BirdMascot';
import chirpLogo from '@/assets/chirp-logo.png';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/welcome');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-primary-glow flex flex-col items-center justify-center">
      <div className="text-center animate-slide-up">
        <div className="mb-8">
          <img 
            src={chirpLogo} 
            alt="Chirp" 
            className="w-64 h-32 mx-auto object-contain"
          />
        </div>
        
        <div className="mb-6">
          <BirdMascot 
            size="large"
            animation="bounce"
            className="mx-auto"
          />
        </div>
        
        <div className="animate-sparkle">
          <div className="w-8 h-1 bg-gradient-rainbow rounded-full mx-auto"></div>
        </div>
      </div>
    </div>
  );
}