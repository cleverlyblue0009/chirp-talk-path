import { useState, useEffect, useCallback } from 'react';
import { RiveBirdCharacter } from './RiveBirdCharacter';
import { ChirpCard } from '@/components/ChirpCard';
import { ChirpButton } from '@/components/ChirpButton';
import { DEFAULT_BIRD_CHARACTERS } from '@/types/conversational-assessment';
import { Camera, Mic, Wifi, RefreshCw, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorState {
  type: 'camera' | 'microphone' | 'network' | 'analysis' | 'speech' | 'general';
  message: string;
  childFriendlyMessage: string;
  birdResponse: string;
  birdMood: string;
  canRetry: boolean;
  fallbackMode?: string;
  severity: 'low' | 'medium' | 'high';
}

interface ChildFriendlyErrorHandlerProps {
  onRetry?: () => void;
  onFallbackMode?: (mode: string) => void;
  onContinueWithoutFeature?: (feature: string) => void;
  className?: string;
}

export function ChildFriendlyErrorHandler({
  onRetry,
  onFallbackMode,
  onContinueWithoutFeature,
  className
}: ChildFriendlyErrorHandlerProps) {
  const [currentError, setCurrentError] = useState<ErrorState | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);

  // Error detection and handling
  const handleError = useCallback((error: {
    type: ErrorState['type'];
    originalMessage: string;
    severity?: ErrorState['severity'];
  }) => {
    const errorState = createChildFriendlyError(error.type, error.originalMessage, error.severity);
    setCurrentError(errorState);
    setRetryCount(0);
    setShowFallbackOptions(false);
  }, []);

  // Create child-friendly error messages
  const createChildFriendlyError = (
    type: ErrorState['type'], 
    originalMessage: string,
    severity: ErrorState['severity'] = 'medium'
  ): ErrorState => {
    const errorConfigs: Record<ErrorState['type'], Omit<ErrorState, 'type' | 'message'>> = {
      camera: {
        childFriendlyMessage: "I'm having trouble seeing you clearly!",
        birdResponse: "Don't worry! Sometimes cameras need a little help. Can we try to fix this together?",
        birdMood: 'think',
        canRetry: true,
        fallbackMode: 'audio_only',
        severity: 'medium'
      },
      microphone: {
        childFriendlyMessage: "I can't hear you very well right now.",
        birdResponse: "That's okay! We can try a few different ways to talk. Let me help you fix this!",
        birdMood: 'comfort',
        canRetry: true,
        fallbackMode: 'visual_only',
        severity: 'medium'
      },
      network: {
        childFriendlyMessage: "Our connection is a little slow today.",
        birdResponse: "Sometimes the internet gets tired too! Let's wait a moment and try again.",
        birdMood: 'think',
        canRetry: true,
        fallbackMode: 'offline_mode',
        severity: 'high'
      },
      analysis: {
        childFriendlyMessage: "I'm thinking really hard but need a moment.",
        birdResponse: "My bird brain is working extra hard today! Give me just a second to catch up.",
        birdMood: 'think',
        canRetry: true,
        fallbackMode: 'simplified_mode',
        severity: 'low'
      },
      speech: {
        childFriendlyMessage: "I didn't quite catch what you said.",
        birdResponse: "Sometimes I miss things too! Can you try saying that again? Take your time!",
        birdMood: 'idle',
        canRetry: true,
        fallbackMode: 'gesture_mode',
        severity: 'low'
      },
      general: {
        childFriendlyMessage: "Something unexpected happened.",
        birdResponse: "Oops! Even birds make mistakes sometimes. Let's try that again together!",
        birdMood: 'comfort',
        canRetry: true,
        fallbackMode: 'safe_mode',
        severity: 'medium'
      }
    };

    const config = errorConfigs[type];
    return {
      type,
      message: originalMessage,
      ...config,
      severity: severity || config.severity
    };
  };

  // Handle retry attempts
  const handleRetry = useCallback(async () => {
    if (!currentError || !currentError.canRetry) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Give time for user to see retry
      onRetry?.();
      
      // If retry successful, clear error
      setCurrentError(null);
      setIsRetrying(false);
    } catch (error) {
      setIsRetrying(false);
      
      // After 2 failed retries, show fallback options
      if (retryCount >= 2) {
        setShowFallbackOptions(true);
      }
    }
  }, [currentError, retryCount, onRetry]);

  // Handle fallback mode activation
  const activateFallbackMode = useCallback((mode: string) => {
    setCurrentError(null);
    setShowFallbackOptions(false);
    onFallbackMode?.(mode);
  }, [onFallbackMode]);

  // Handle continuing without feature
  const continueWithoutFeature = useCallback((feature: string) => {
    setCurrentError(null);
    setShowFallbackOptions(false);
    onContinueWithoutFeature?.(feature);
  }, [onContinueWithoutFeature]);

  // Auto-detection of common errors
  useEffect(() => {
    const detectErrors = async () => {
      // Camera detection
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        if (error instanceof Error && error.name === 'NotAllowedError') {
          handleError({
            type: 'camera',
            originalMessage: 'Camera permission denied',
            severity: 'high'
          });
        }
      }

      // Microphone detection
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        if (error instanceof Error && error.name === 'NotAllowedError') {
          handleError({
            type: 'microphone',
            originalMessage: 'Microphone permission denied',
            severity: 'high'
          });
        }
      }

      // Network detection
      if (!navigator.onLine) {
        handleError({
          type: 'network',
          originalMessage: 'No internet connection',
          severity: 'high'
        });
      }
    };

    // Only run detection if no current error
    if (!currentError) {
      detectErrors();
    }
  }, [handleError, currentError]);

  // Render different error states
  if (!currentError) return null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Bird Character with Appropriate Response */}
      <div className="flex justify-center">
        <RiveBirdCharacter
          character={DEFAULT_BIRD_CHARACTERS[0]} // Chirpy
          currentMood={currentError.birdMood}
          size="large"
          isActive={true}
        />
      </div>

      {/* Error Message Card */}
      <ChirpCard className="text-center space-y-4">
        {/* Child-Friendly Title */}
        <div className="space-y-2">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-full flex items-center justify-center",
            currentError.severity === 'high' ? 'bg-red-100' :
            currentError.severity === 'medium' ? 'bg-yellow-100' :
            'bg-blue-100'
          )}>
            {currentError.type === 'camera' && <Camera className="w-8 h-8 text-blue-600" />}
            {currentError.type === 'microphone' && <Mic className="w-8 h-8 text-blue-600" />}
            {currentError.type === 'network' && <Wifi className="w-8 h-8 text-blue-600" />}
            {['analysis', 'speech', 'general'].includes(currentError.type) && 
              <Heart className="w-8 h-8 text-blue-600" />}
          </div>
          
          <h3 className="text-xl font-bold text-primary">
            {currentError.childFriendlyMessage}
          </h3>
        </div>

        {/* Bird's Encouraging Response */}
        <div className="bg-primary/10 rounded-lg p-4">
          <p className="text-primary font-medium italic">
            "{currentError.birdResponse}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Retry Button */}
          {currentError.canRetry && !showFallbackOptions && (
            <ChirpButton
              onClick={handleRetry}
              disabled={isRetrying}
              icon={RefreshCw}
              size="lg"
              className={cn(
                "w-full",
                isRetrying && "animate-pulse"
              )}
            >
              {isRetrying ? 'Trying Again...' : 
               retryCount === 0 ? 'Try Again' : 
               `Try Again (${retryCount + 1})`}
            </ChirpButton>
          )}

          {/* Fallback Options */}
          {showFallbackOptions && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Let's try a different way to play!
              </p>
              
              {currentError.fallbackMode && (
                <ChirpButton
                  onClick={() => activateFallbackMode(currentError.fallbackMode!)}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  {getFallbackModeLabel(currentError.fallbackMode)}
                </ChirpButton>
              )}

              <ChirpButton
                onClick={() => continueWithoutFeature(currentError.type)}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Continue Anyway
              </ChirpButton>
            </div>
          )}

          {/* Immediate Fallback for High Severity */}
          {currentError.severity === 'high' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Don't worry! We can still have fun:
              </p>
              
              {currentError.fallbackMode && (
                <ChirpButton
                  onClick={() => activateFallbackMode(currentError.fallbackMode!)}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  {getFallbackModeLabel(currentError.fallbackMode)}
                </ChirpButton>
              )}
            </div>
          )}
        </div>

        {/* Encouraging Footer */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {getEncouragingMessage(currentError.type, retryCount)}
          </p>
        </div>
      </ChirpCard>

      {/* Technical Details for Parents/Caregivers (Collapsible) */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          Technical details (for grown-ups)
        </summary>
        <div className="mt-2 p-3 bg-muted rounded-lg">
          <p><strong>Error Type:</strong> {currentError.type}</p>
          <p><strong>Message:</strong> {currentError.message}</p>
          <p><strong>Retry Count:</strong> {retryCount}</p>
          <p><strong>Suggested Action:</strong> {getTechnicalSuggestion(currentError.type)}</p>
        </div>
      </details>
    </div>
  );
}

// Helper functions
function getFallbackModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    audio_only: "Let's Just Talk! 🎤",
    visual_only: "Let's Use Gestures! 👋",
    offline_mode: "Play Without Internet 🏠",
    simplified_mode: "Simple Mode 🌟",
    gesture_mode: "Point and Click Mode 👆",
    safe_mode: "Extra Safe Mode 🛡️"
  };
  return labels[mode] || "Try Different Way";
}

function getEncouragingMessage(errorType: string, retryCount: number): string {
  const messages: Record<string, string[]> = {
    camera: [
      "You're doing great! Technology can be tricky sometimes.",
      "Keep trying! Every bird learns to fly at their own pace.",
      "Don't worry! The most important thing is that we're having fun together."
    ],
    microphone: [
      "Your voice is important to us! Let's make sure we can hear you.",
      "Sometimes microphones are shy too! Let's help it feel better.",
      "We believe in you! Every voice deserves to be heard."
    ],
    network: [
      "The internet is having a slow day, but we're still here for you!",
      "Even without the internet, we can still be great friends!",
      "You're being so patient! That's a wonderful quality."
    ],
    analysis: [
      "My bird brain is working hard to understand you better!",
      "You're teaching me so much! Thank you for being patient.",
      "Every conversation makes me a smarter bird!"
    ],
    speech: [
      "I love hearing your voice! Sometimes I just need to listen more carefully.",
      "You're such a good speaker! Help me be a better listener.",
      "Communication takes practice for everyone, even birds!"
    ],
    general: [
      "Oops! Even the smartest birds make mistakes sometimes.",
      "Thank you for being so understanding! You're amazing.",
      "Every challenge makes us stronger friends!"
    ]
  };

  const typeMessages = messages[errorType] || messages.general;
  const messageIndex = Math.min(retryCount, typeMessages.length - 1);
  return typeMessages[messageIndex];
}

function getTechnicalSuggestion(errorType: string): string {
  const suggestions: Record<string, string> = {
    camera: "Check camera permissions in browser settings. Ensure camera is not being used by another application.",
    microphone: "Verify microphone permissions. Check if microphone is muted or being used elsewhere.",
    network: "Check internet connection. Consider enabling offline mode if available.",
    analysis: "Reduce analysis complexity or increase processing time. Consider using fallback analysis methods.",
    speech: "Check audio input levels. Consider using alternative input methods.",
    general: "Refresh the page or restart the application. Check browser console for detailed error information."
  };
  return suggestions[errorType] || "Contact support if the issue persists.";
}

// Hook for using the error handler
export function useChildFriendlyErrorHandler() {
  const [errorHandler, setErrorHandler] = useState<((error: {
    type: ErrorState['type'];
    originalMessage: string;
    severity?: ErrorState['severity'];
  }) => void) | null>(null);

  const reportError = useCallback((
    type: ErrorState['type'],
    originalMessage: string,
    severity: ErrorState['severity'] = 'medium'
  ) => {
    errorHandler?.({ type, originalMessage, severity });
  }, [errorHandler]);

  const reportCameraError = useCallback((message: string) => {
    reportError('camera', message, 'medium');
  }, [reportError]);

  const reportMicrophoneError = useCallback((message: string) => {
    reportError('microphone', message, 'medium');
  }, [reportError]);

  const reportNetworkError = useCallback((message: string) => {
    reportError('network', message, 'high');
  }, [reportError]);

  const reportAnalysisError = useCallback((message: string) => {
    reportError('analysis', message, 'low');
  }, [reportError]);

  const reportSpeechError = useCallback((message: string) => {
    reportError('speech', message, 'low');
  }, [reportError]);

  return {
    setErrorHandler,
    reportError,
    reportCameraError,
    reportMicrophoneError,
    reportNetworkError,
    reportAnalysisError,
    reportSpeechError
  };
}