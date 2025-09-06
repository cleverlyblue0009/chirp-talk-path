import { useState, useEffect } from 'react';
import { RealTimeAnalysisState } from '@/types/conversational-assessment';
import { ChirpCard } from '@/components/ChirpCard';
import { Eye, Heart, Brain, Mic, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveAnalysisDisplayProps {
  analysisState: RealTimeAnalysisState | null;
  isVisible?: boolean;
  className?: string;
}

export function LiveAnalysisDisplay({
  analysisState,
  isVisible = true,
  className
}: LiveAnalysisDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!analysisState || !isVisible) {
    return null;
  }

  const { current } = analysisState;

  // Get emotion emoji
  const getEmotionEmoji = (emotion: string): string => {
    const emojiMap: Record<string, string> = {
      'happy': '😊',
      'excited': '🤩',
      'focused': '🤔',
      'curious': '😮',
      'confused': '😕',
      'shy': '😳',
      'neutral': '😐',
      'sad': '😔'
    };
    return emojiMap[emotion] || '😐';
  };

  // Get engagement color
  const getEngagementColor = (level: number): string => {
    if (level >= 70) return 'text-green-600 bg-green-50';
    if (level >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get eye contact indicator
  const getEyeContactIndicator = () => {
    if (current.eyeContact.isLookingAtCamera) {
      return {
        icon: '👁️',
        color: 'text-blue-600 bg-blue-50',
        text: `Looking (${current.eyeContact.duration}s)`
      };
    }
    return {
      icon: '👀',
      color: 'text-gray-600 bg-gray-50',
      text: 'Looking away'
    };
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main Status Bar */}
      <ChirpCard className="p-3">
        <div className="flex items-center justify-between space-x-4">
          {/* Emotion */}
          <div className="flex items-center space-x-2">
            <div className="text-2xl">
              {getEmotionEmoji(current.facialEmotion.primary)}
            </div>
            <div className="text-sm">
              <div className="font-medium capitalize">
                {current.facialEmotion.primary}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(current.facialEmotion.confidence * 100)}% sure
              </div>
            </div>
          </div>

          {/* Eye Contact */}
          <div className="flex items-center space-x-2">
            <Eye className={cn(
              'w-4 h-4',
              current.eyeContact.isLookingAtCamera ? 'text-blue-600' : 'text-gray-400'
            )} />
            <div className="text-sm">
              <div className={cn(
                'font-medium',
                current.eyeContact.isLookingAtCamera ? 'text-blue-600' : 'text-gray-500'
              )}>
                {current.eyeContact.isLookingAtCamera ? 'Looking' : 'Away'}
              </div>
              <div className="text-xs text-muted-foreground">
                {current.eyeContact.duration.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Engagement */}
          <div className="flex items-center space-x-2">
            <Heart className={cn(
              'w-4 h-4',
              current.engagementLevel.level >= 60 ? 'text-green-600' : 'text-yellow-600'
            )} />
            <div className="text-sm">
              <div className={cn(
                'font-medium',
                getEngagementColor(current.engagementLevel.level)
              )}>
                {current.engagementLevel.level}%
              </div>
              <div className="text-xs text-muted-foreground">
                Engaged
              </div>
            </div>
          </div>

          {/* Speech Activity */}
          <div className="flex items-center space-x-2">
            <Mic className={cn(
              'w-4 h-4',
              current.speechMetrics.isActive ? 'text-purple-600' : 'text-gray-400'
            )} />
            <div className="text-sm">
              <div className={cn(
                'font-medium',
                current.speechMetrics.isActive ? 'text-purple-600' : 'text-gray-500'
              )}>
                {current.speechMetrics.isActive ? 'Speaking' : 'Quiet'}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(current.speechMetrics.currentVolume)}%
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Details */}
        <div className="mt-2 pt-2 border-t">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'} ▼
          </button>
        </div>
      </ChirpCard>

      {/* Detailed Analysis */}
      {showDetails && (
        <ChirpCard className="p-3 space-y-3">
          <h4 className="font-medium text-sm">Detailed Analysis</h4>
          
          {/* Emotional State */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">Emotional State</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Valence:</span>
                <span className={cn(
                  'ml-2 font-medium',
                  current.facialEmotion.valence > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {current.facialEmotion.valence > 0 ? 'Positive' : 'Negative'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Energy:</span>
                <span className={cn(
                  'ml-2 font-medium',
                  current.facialEmotion.arousal > 0.5 ? 'text-orange-600' : 'text-blue-600'
                )}>
                  {current.facialEmotion.arousal > 0.5 ? 'High' : 'Calm'}
                </span>
              </div>
            </div>
          </div>

          {/* Eye Contact Details */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">Eye Contact</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Quality:</span>
                <span className={cn(
                  'ml-2 font-medium capitalize',
                  current.eyeContact.quality === 'natural' ? 'text-green-600' :
                  current.eyeContact.quality === 'forced' ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {current.eyeContact.quality}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Pattern:</span>
                <span className={cn(
                  'ml-2 font-medium capitalize',
                  current.eyeContact.gazePattern === 'focused' ? 'text-green-600' : 'text-yellow-600'
                )}>
                  {current.eyeContact.gazePattern}
                </span>
              </div>
            </div>
          </div>

          {/* Engagement Indicators */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">Engagement Indicators</h5>
            <div className="flex flex-wrap gap-1">
              {Object.entries(current.engagementLevel.indicators).map(([key, value]) => (
                <span
                  key={key}
                  className={cn(
                    'px-2 py-1 rounded-full text-xs capitalize',
                    value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {key.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Comfort Level */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">Comfort Level</h5>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    current.comfortLevel.level >= 70 ? 'bg-green-500' :
                    current.comfortLevel.level >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${current.comfortLevel.level}%` }}
                />
              </div>
              <span className="text-xs font-medium">
                {current.comfortLevel.level}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Recommendation: <span className="font-medium capitalize">
                {current.comfortLevel.recommendation.replace('_', ' ')}
              </span>
            </div>
          </div>
        </ChirpCard>
      )}
    </div>
  );
}