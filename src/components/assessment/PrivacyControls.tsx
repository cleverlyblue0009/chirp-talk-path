import { useState } from 'react';
import { ChirpButton } from '@/components/ChirpButton';
import { ChirpCard } from '@/components/ChirpCard';
import { BirdMascot } from '@/components/BirdMascot';
import { Shield, Trash2, Eye, EyeOff, Download, AlertTriangle } from 'lucide-react';

interface PrivacyControlsProps {
  onPrivacySettingsChange: (settings: PrivacySettings) => void;
  className?: string;
}

export interface PrivacySettings {
  saveRecordings: boolean;
  allowDataAnalysis: boolean;
  shareWithParents: boolean;
  autoDeleteAfter: number; // days, 0 = never
  dataMinimization: boolean;
}

export function PrivacyControls({ onPrivacySettingsChange, className }: PrivacyControlsProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    saveRecordings: false,
    allowDataAnalysis: true,
    shareWithParents: true,
    autoDeleteAfter: 7, // Default 7 days
    dataMinimization: true
  });

  const [showDetails, setShowDetails] = useState(false);

  const updateSetting = <K extends keyof PrivacySettings>(
    key: K, 
    value: PrivacySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onPrivacySettingsChange(newSettings);
  };

  return (
    <ChirpCard className={className}>
      <div className="space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Shield className="w-6 h-6 text-primary mr-2" />
            <h3 className="font-bold text-card-foreground">Privacy & Safety</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            We keep your information safe and private
          </p>
        </div>

        {/* Simple Toggle for Kids */}
        <div className="bg-secondary/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Save my recordings to help me learn</span>
            <button
              onClick={() => updateSetting('saveRecordings', !settings.saveRecordings)}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.saveRecordings ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.saveRecordings ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {settings.saveRecordings 
              ? 'Your recordings help Chirpy learn how to help you better!'
              : 'Your recordings will be deleted right after the assessment.'
            }
          </p>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="text-center">
          <ChirpButton
            variant="secondary"
            size="small"
            onClick={() => setShowDetails(!showDetails)}
            icon={showDetails ? EyeOff : Eye}
          >
            {showDetails ? 'Hide Details' : 'Show More Options'}
          </ChirpButton>
        </div>

        {/* Advanced Privacy Controls */}
        {showDetails && (
          <div className="space-y-3 animate-slide-up">
            <div className="bg-secondary/10 rounded-lg p-3 space-y-3">
              
              {/* Data Analysis */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm font-medium">Allow data analysis</span>
                  <p className="text-xs text-muted-foreground">
                    Help improve Chirp for all kids
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('allowDataAnalysis', !settings.allowDataAnalysis)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.allowDataAnalysis ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.allowDataAnalysis ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Share with Parents */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm font-medium">Share results with parents</span>
                  <p className="text-xs text-muted-foreground">
                    Let parents see your progress
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('shareWithParents', !settings.shareWithParents)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.shareWithParents ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.shareWithParents ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Auto Delete */}
              {settings.saveRecordings && (
                <div>
                  <span className="text-sm font-medium block mb-2">Auto-delete recordings after:</span>
                  <div className="flex space-x-2">
                    {[1, 7, 30, 0].map((days) => (
                      <button
                        key={days}
                        onClick={() => updateSetting('autoDeleteAfter', days)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                          settings.autoDeleteAfter === days
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {days === 0 ? 'Never' : `${days} day${days === 1 ? '' : 's'}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Minimization */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm font-medium">Minimal data collection</span>
                  <p className="text-xs text-muted-foreground">
                    Only collect what's needed for assessment
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('dataMinimization', !settings.dataMinimization)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.dataMinimization ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.dataMinimization ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">Your Privacy Matters</p>
                  <p>
                    All recordings are encrypted and stored securely. You can delete your data anytime by asking a parent or teacher to contact us.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <ChirpButton
                variant="secondary"
                size="small"
                icon={Trash2}
                onClick={() => {
                  // Clear all local data
                  localStorage.removeItem('chirp_assessment_results');
                  localStorage.removeItem('chirp_game_state');
                  alert('All your data has been cleared!');
                }}
                className="flex-1"
              >
                Clear My Data
              </ChirpButton>
              <ChirpButton
                variant="secondary"
                size="small"
                icon={Download}
                onClick={() => {
                  // Export data for parents
                  const data = {
                    assessmentResults: localStorage.getItem('chirp_assessment_results'),
                    gameState: localStorage.getItem('chirp_game_state'),
                    exportDate: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'chirp_data_export.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1"
              >
                Export Data
              </ChirpButton>
            </div>
          </div>
        )}

        {/* Mascot with Privacy Message */}
        <div className="text-center">
          <BirdMascot 
            size="small"
            showBubble
            message="Your privacy is super important to me!"
            animation="wiggle"
          />
        </div>
      </div>
    </ChirpCard>
  );
}

// Utility functions for privacy management
export class PrivacyManager {
  private static readonly STORAGE_KEY = 'chirp_privacy_settings';
  
  static getSettings(): PrivacySettings {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
    
    // Default privacy-first settings
    return {
      saveRecordings: false,
      allowDataAnalysis: false,
      shareWithParents: true,
      autoDeleteAfter: 1,
      dataMinimization: true
    };
  }
  
  static saveSettings(settings: PrivacySettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }
  
  static shouldSaveRecording(): boolean {
    return this.getSettings().saveRecordings;
  }
  
  static shouldAnalyzeData(): boolean {
    return this.getSettings().allowDataAnalysis;
  }
  
  static getAutoDeleteDays(): number {
    return this.getSettings().autoDeleteAfter;
  }
  
  static clearAllData(): void {
    const keys = [
      'chirp_assessment_results',
      'chirp_game_state',
      'chirp_privacy_settings',
      'chirp_user_recordings'
    ];
    
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Failed to clear ${key}:`, error);
      }
    });
  }
  
  static scheduleDataDeletion(): void {
    const settings = this.getSettings();
    if (settings.autoDeleteAfter > 0) {
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() + settings.autoDeleteAfter);
      
      localStorage.setItem('chirp_delete_date', deleteDate.toISOString());
      
      // Check if data should be deleted (run this on app startup)
      this.checkAndDeleteExpiredData();
    }
  }
  
  static checkAndDeleteExpiredData(): void {
    try {
      const deleteDateStr = localStorage.getItem('chirp_delete_date');
      if (deleteDateStr) {
        const deleteDate = new Date(deleteDateStr);
        if (new Date() >= deleteDate) {
          this.clearAllData();
          console.log('Expired data automatically deleted');
        }
      }
    } catch (error) {
      console.error('Failed to check for expired data:', error);
    }
  }
}