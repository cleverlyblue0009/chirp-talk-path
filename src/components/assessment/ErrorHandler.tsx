import { useState, useEffect } from 'react';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { BirdMascot } from '@/components/BirdMascot';
import { AlertTriangle, RefreshCw, SkipForward, Home, HelpCircle } from 'lucide-react';

interface ErrorHandlerProps {
  error: AssessmentError | null;
  onRetry: () => void;
  onSkip: () => void;
  onGoHome: () => void;
  className?: string;
}

export interface AssessmentError {
  type: 'camera' | 'microphone' | 'network' | 'browser' | 'analysis' | 'unknown';
  message: string;
  details?: string;
  recoverable: boolean;
  skipAllowed: boolean;
}

export function ErrorHandler({ error, onRetry, onSkip, onGoHome, className }: ErrorHandlerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (error) {
      setRetryCount(0);
    }
  }, [error]);

  if (!error) return null;

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    onRetry();
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case 'camera': return '📹';
      case 'microphone': return '🎤';
      case 'network': return '🌐';
      case 'browser': return '🔧';
      case 'analysis': return '🧠';
      default: return '⚠️';
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'camera': return 'Camera Not Available';
      case 'microphone': return 'Microphone Not Available';
      case 'network': return 'Connection Problem';
      case 'browser': return 'Browser Issue';
      case 'analysis': return 'Analysis Problem';
      default: return 'Something Went Wrong';
    }
  };

  const getChildFriendlyMessage = () => {
    switch (error.type) {
      case 'camera':
        return "I can't see you right now! Let's check if your camera is working.";
      case 'microphone':
        return "I can't hear you right now! Let's check if your microphone is working.";
      case 'network':
        return "I'm having trouble connecting. Let's try again!";
      case 'browser':
        return "Your browser needs a little help. Let's try refreshing!";
      case 'analysis':
        return "I'm having trouble understanding. That's okay - we can try again!";
      default:
        return "Oops! Something didn't work as expected. Don't worry, we can fix this!";
    }
  };

  const getSuggestions = () => {
    switch (error.type) {
      case 'camera':
        return [
          'Make sure your camera is connected',
          'Check if another app is using your camera',
          'Try refreshing the page',
          'Ask an adult to check your camera permissions'
        ];
      case 'microphone':
        return [
          'Make sure your microphone is connected',
          'Check if it\'s muted',
          'Try speaking a bit louder',
          'Ask an adult to check your microphone permissions'
        ];
      case 'network':
        return [
          'Check your internet connection',
          'Try moving closer to your WiFi router',
          'Ask an adult to check the internet',
          'Try again in a few minutes'
        ];
      case 'browser':
        return [
          'Try refreshing the page',
          'Close other browser tabs',
          'Try using a different browser',
          'Ask an adult for help'
        ];
      case 'analysis':
        return [
          'Speak a bit more clearly',
          'Try moving to a quieter place',
          'Make sure you\'re well-lit for the camera',
          'It\'s okay to skip this question'
        ];
      default:
        return [
          'Try refreshing the page',
          'Check your internet connection',
          'Ask an adult for help',
          'It\'s okay to skip this part'
        ];
    }
  };

  const maxRetries = 3;
  const showSkipOption = error.skipAllowed || retryCount >= maxRetries;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <ChirpCard className={`max-w-md w-full animate-scale-in ${className}`}>
        <div className="text-center space-y-4">
          {/* Error Icon and Title */}
          <div>
            <div className="text-4xl mb-2">{getErrorIcon()}</div>
            <h3 className="text-lg font-bold text-card-foreground">
              {getErrorTitle()}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {getChildFriendlyMessage()}
            </p>
          </div>

          {/* Mascot with encouraging message */}
          <div className="flex justify-center">
            <BirdMascot 
              size="medium"
              animation="wiggle"
              showBubble
              message="Don't worry! We can fix this together!"
            />
          </div>

          {/* Error Details (collapsed by default) */}
          <div className="text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showDetails ? 'Hide' : 'Show'} suggestions</span>
            </button>

            {showDetails && (
              <div className="mt-3 bg-secondary/10 rounded-lg p-3 animate-slide-up">
                <p className="text-sm font-medium text-card-foreground mb-2">
                  Here's what we can try:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {getSuggestions().map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-primary">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
                
                {error.details && (
                  <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    <p className="font-medium">Technical details:</p>
                    <p className="font-mono">{error.details}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {error.recoverable && retryCount < maxRetries && (
              <ChirpButton
                variant="primary"
                icon={RefreshCw}
                onClick={handleRetry}
                className="w-full"
              >
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </ChirpButton>
            )}

            {showSkipOption && (
              <ChirpButton
                variant="secondary"
                icon={SkipForward}
                onClick={onSkip}
                className="w-full"
              >
                Skip This Part
              </ChirpButton>
            )}

            <ChirpButton
              variant="secondary"
              icon={Home}
              onClick={onGoHome}
              className="w-full"
            >
              Go to Home
            </ChirpButton>
          </div>

          {/* Retry Counter Warning */}
          {retryCount >= 2 && retryCount < maxRetries && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-orange-700">
                  If this keeps happening, you can skip this question and continue!
                </p>
              </div>
            </div>
          )}

          {/* Encouragement */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground italic">
              "Every challenge is a chance to learn something new!" - Chirpy 🐦
            </p>
          </div>
        </div>
      </ChirpCard>
    </div>
  );
}

// Error creation utilities
export class AssessmentErrorHandler {
  
  static createCameraError(details?: string): AssessmentError {
    return {
      type: 'camera',
      message: 'Camera access failed',
      details,
      recoverable: true,
      skipAllowed: true
    };
  }

  static createMicrophoneError(details?: string): AssessmentError {
    return {
      type: 'microphone',
      message: 'Microphone access failed',
      details,
      recoverable: true,
      skipAllowed: true
    };
  }

  static createNetworkError(details?: string): AssessmentError {
    return {
      type: 'network',
      message: 'Network connection failed',
      details,
      recoverable: true,
      skipAllowed: false
    };
  }

  static createBrowserError(details?: string): AssessmentError {
    return {
      type: 'browser',
      message: 'Browser compatibility issue',
      details,
      recoverable: true,
      skipAllowed: true
    };
  }

  static createAnalysisError(details?: string): AssessmentError {
    return {
      type: 'analysis',
      message: 'Analysis processing failed',
      details,
      recoverable: true,
      skipAllowed: true
    };
  }

  static createUnknownError(message: string, details?: string): AssessmentError {
    return {
      type: 'unknown',
      message,
      details,
      recoverable: true,
      skipAllowed: true
    };
  }

  // Helper method to handle common errors
  static handleMediaError(error: any): AssessmentError {
    if (error.name === 'NotAllowedError') {
      return error.constraint?.includes('video') || error.message?.includes('camera')
        ? this.createCameraError('Permission denied')
        : this.createMicrophoneError('Permission denied');
    }
    
    if (error.name === 'NotFoundError') {
      return error.constraint?.includes('video') || error.message?.includes('camera')
        ? this.createCameraError('No camera found')
        : this.createMicrophoneError('No microphone found');
    }
    
    if (error.name === 'NotReadableError') {
      return error.constraint?.includes('video') || error.message?.includes('camera')
        ? this.createCameraError('Camera is busy')
        : this.createMicrophoneError('Microphone is busy');
    }

    return this.createUnknownError('Media device error', error.message);
  }

  // Check browser compatibility
  static checkBrowserSupport(): AssessmentError | null {
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasWebRTC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    const hasSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!hasMediaDevices) {
      return this.createBrowserError('MediaDevices API not supported');
    }

    if (!hasWebRTC) {
      return this.createBrowserError('WebRTC not supported');
    }

    // Speech recognition is optional, so we don't fail for this
    if (!hasSpeechRecognition) {
      console.warn('Speech Recognition API not supported');
    }

    return null;
  }

  // Log errors for debugging (in production, send to analytics)
  static logError(error: AssessmentError, context?: string): void {
    console.error('Assessment Error:', {
      type: error.type,
      message: error.message,
      details: error.details,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    // In production, you would send this to your error tracking service
    // e.g., Sentry, LogRocket, etc.
  }
}