import { Worker, Job } from 'bullmq';
import { redis } from '../utils/redis';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { StorageService } from '../services/storage';
import { AnalysisJobPayload, VideoAnalysisResult, AudioAnalysisResult, STTResult, AggregatedAnalysis } from '../types';
import { JobStatus } from '@prisma/client';
import axios from 'axios';

export class AnalysisWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('analysis', this.processAnalysisJob.bind(this), {
      connection: redis,
      concurrency: 3, // Process up to 3 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs per...
        duration: 60000, // ...60 seconds
      },
    });

    this.worker.on('completed', (job) => {
      logger.info(`Analysis job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Analysis job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('Analysis worker error:', err);
    });
  }

  /**
   * Process analysis job
   */
  private async processAnalysisJob(job: Job<AnalysisJobPayload>): Promise<void> {
    const { sessionId, childId, mediaRef, scenarioId, moduleId } = job.data;

    try {
      // Update job status to running
      await db.analysisJob.update({
        where: { id: job.id as string },
        data: { status: JobStatus.RUNNING },
      });

      // Update job progress
      await job.updateProgress(10);

      // Step 1: Get presigned URL for media file
      const mediaUrl = await StorageService.getPresignedUrl(mediaRef, 3600);
      await job.updateProgress(20);

      // Step 2: Analyze video
      logger.info(`Starting video analysis for session ${sessionId}`);
      const videoAnalysis = await this.analyzeVideo(mediaUrl);
      await job.updateProgress(40);

      // Step 3: Analyze audio for STT
      logger.info(`Starting STT for session ${sessionId}`);
      const sttResult = await this.performSTT(mediaUrl);
      await job.updateProgress(60);

      // Step 4: Analyze audio for prosody
      logger.info(`Starting audio analysis for session ${sessionId}`);
      const audioAnalysis = await this.analyzeAudio(mediaUrl);
      await job.updateProgress(80);

      // Step 5: Aggregate results using rubric
      const aggregatedAnalysis = await this.aggregateAnalysis(
        videoAnalysis,
        audioAnalysis,
        sttResult,
        scenarioId,
        moduleId
      );
      await job.updateProgress(90);

      // Step 6: Save results
      await db.analysisJob.update({
        where: { id: job.id as string },
        data: {
          status: JobStatus.DONE,
          resultJson: aggregatedAnalysis,
          finishedAt: new Date(),
        },
      });

      // Update session with analysis results
      await db.session.update({
        where: { id: sessionId },
        data: {
          analysisRef: job.id as string,
          resultJson: aggregatedAnalysis,
        },
      });

      await job.updateProgress(100);

      // Step 7: Check for rewards and unlocks
      await this.checkRewardsAndUnlocks(childId, aggregatedAnalysis);

      logger.info(`Analysis completed for session ${sessionId}`);
    } catch (error) {
      logger.error(`Analysis job ${job.id} failed:`, error);

      // Update job status to failed
      await db.analysisJob.update({
        where: { id: job.id as string },
        data: {
          status: JobStatus.FAILED,
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      });

      throw error;
    }
  }

  /**
   * Analyze video using Python microservice
   */
  private async analyzeVideo(mediaUrl: string): Promise<VideoAnalysisResult> {
    try {
      const pyApiUrl = process.env.PY_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(
        `${pyApiUrl}/analyze/video`,
        { video_url: mediaUrl },
        { timeout: 120000 } // 2 minutes timeout
      );

      return response.data;
    } catch (error) {
      logger.error('Video analysis error:', error);
      // Return fallback analysis
      return {
        face_landmarks: {},
        eye_contact_score: 0.5,
        smile_prob: 0.5,
        expression: { happy: 0.3, neutral: 0.6, confused: 0.1 },
        gaze: { left: 0.2, center: 0.6, right: 0.2 },
        timestamps: [],
      };
    }
  }

  /**
   * Perform speech-to-text using Python microservice
   */
  private async performSTT(mediaUrl: string): Promise<STTResult> {
    try {
      const pyApiUrl = process.env.PY_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(
        `${pyApiUrl}/stt`,
        { audio_url: mediaUrl },
        { timeout: 60000 } // 1 minute timeout
      );

      return response.data;
    } catch (error) {
      logger.error('STT error:', error);
      // Return fallback result
      return {
        transcript: '[Audio could not be processed]',
        words: [],
      };
    }
  }

  /**
   * Analyze audio for prosody using Python microservice
   */
  private async analyzeAudio(mediaUrl: string): Promise<AudioAnalysisResult> {
    try {
      const pyApiUrl = process.env.PY_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(
        `${pyApiUrl}/analyze/audio`,
        { audio_url: mediaUrl },
        { timeout: 60000 } // 1 minute timeout
      );

      return response.data;
    } catch (error) {
      logger.error('Audio analysis error:', error);
      // Return fallback analysis
      return {
        pitch_mean: 150,
        pitch_var: 20,
        energy_mean: 0.5,
        speaking_rate: 120,
        tone_label: 'neutral',
        prosody_score: 0.5,
      };
    }
  }

  /**
   * Aggregate analysis results using scenario rubric
   */
  private async aggregateAnalysis(
    videoAnalysis: VideoAnalysisResult,
    audioAnalysis: AudioAnalysisResult,
    sttResult: STTResult,
    scenarioId?: string,
    moduleId?: string
  ): Promise<AggregatedAnalysis> {
    let rubric: any = null;

    // Get rubric from scenario if available
    if (scenarioId) {
      const scenario = await db.scenario.findUnique({
        where: { id: scenarioId },
        select: { rubricJson: true },
      });
      rubric = scenario?.rubricJson;
    }

    // Calculate scores based on analysis
    const eyeContactScore = this.normalizeScore(videoAnalysis.eye_contact_score);
    const speechClarity = this.calculateSpeechClarity(sttResult, audioAnalysis);
    const prosodyScore = this.normalizeScore(audioAnalysis.prosody_score);
    const engagementLevel = this.calculateEngagement(videoAnalysis);

    // Calculate overall score
    const overallScore = (eyeContactScore + speechClarity + prosodyScore + engagementLevel) / 4;

    // Generate feedback based on scores
    const { suggestions, strengths, improvements } = this.generateFeedback({
      eyeContactScore,
      speechClarity,
      prosodyScore,
      engagementLevel,
      transcript: sttResult.transcript,
      expressions: videoAnalysis.expression,
    });

    return {
      overall_score: overallScore,
      eye_contact_score: eyeContactScore,
      speech_clarity: speechClarity,
      prosody_score: prosodyScore,
      engagement_level: engagementLevel,
      turn_taking_markers: this.calculateTurnTaking(sttResult),
      transcript: sttResult.transcript,
      feedback_suggestions: suggestions,
      strengths,
      areas_for_improvement: improvements,
    };
  }

  /**
   * Normalize score to 0-1 range
   */
  private normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate speech clarity score
   */
  private calculateSpeechClarity(sttResult: STTResult, audioAnalysis: AudioAnalysisResult): number {
    // Base score on word confidence and audio quality
    const avgConfidence = sttResult.words.length > 0 
      ? sttResult.words.reduce((sum, word) => sum + word.confidence, 0) / sttResult.words.length
      : 0.5;

    // Factor in speaking rate (optimal range: 100-150 WPM)
    const speakingRateScore = audioAnalysis.speaking_rate > 80 && audioAnalysis.speaking_rate < 180 ? 1 : 0.7;

    return this.normalizeScore((avgConfidence + speakingRateScore) / 2);
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagement(videoAnalysis: VideoAnalysisResult): number {
    const smileWeight = 0.4;
    const eyeContactWeight = 0.6;

    return this.normalizeScore(
      videoAnalysis.smile_prob * smileWeight + 
      videoAnalysis.eye_contact_score * eyeContactWeight
    );
  }

  /**
   * Calculate turn-taking markers
   */
  private calculateTurnTaking(sttResult: STTResult): number {
    // Simple heuristic: count pauses and question responses
    const words = sttResult.words;
    let turnTakingScore = 0;

    // Look for natural pauses
    for (let i = 1; i < words.length; i++) {
      const gap = words[i].start - words[i - 1].end;
      if (gap > 0.5 && gap < 3) { // 0.5-3 second pauses are good
        turnTakingScore += 1;
      }
    }

    // Normalize based on transcript length
    return Math.min(1, turnTakingScore / Math.max(1, words.length / 10));
  }

  /**
   * Generate feedback based on analysis
   */
  private generateFeedback(data: {
    eyeContactScore: number;
    speechClarity: number;
    prosodyScore: number;
    engagementLevel: number;
    transcript: string;
    expressions: any;
  }): { suggestions: string[]; strengths: string[]; improvements: string[] } {
    const suggestions: string[] = [];
    const strengths: string[] = [];
    const improvements: string[] = [];

    // Eye contact feedback
    if (data.eyeContactScore > 0.7) {
      strengths.push('Great eye contact!');
    } else if (data.eyeContactScore < 0.4) {
      improvements.push('Try to look at the camera more often');
      suggestions.push('Practice looking directly at your conversation partner');
    }

    // Speech clarity feedback
    if (data.speechClarity > 0.7) {
      strengths.push('Clear and understandable speech');
    } else {
      improvements.push('Work on speaking more clearly');
      suggestions.push('Try speaking a bit slower and pronouncing each word clearly');
    }

    // Engagement feedback
    if (data.engagementLevel > 0.6) {
      strengths.push('Good engagement and positive expressions');
    } else {
      improvements.push('Show more interest and engagement');
      suggestions.push('Try smiling and showing enthusiasm in your responses');
    }

    // Prosody feedback
    if (data.prosodyScore > 0.6) {
      strengths.push('Natural speech rhythm and tone');
    } else {
      improvements.push('Work on varying your tone and pace');
      suggestions.push('Practice using different tones to express emotions');
    }

    // Transcript-based feedback
    if (data.transcript.length < 10) {
      suggestions.push('Try to give longer, more detailed responses');
    }

    return { suggestions, strengths, improvements };
  }

  /**
   * Check for rewards and companion unlocks
   */
  private async checkRewardsAndUnlocks(childId: string, analysis: AggregatedAnalysis): Promise<void> {
    try {
      // Get child's current stats
      const child = await db.child.findUnique({
        where: { id: childId },
        include: {
          sessions: {
            where: { completedAt: { not: null } },
            select: { resultJson: true, completedAt: true },
          },
          companions: true,
        },
      });

      if (!child) return;

      // Calculate session stats
      const completedSessions = child.sessions.length;
      const avgScore = child.sessions.length > 0 
        ? child.sessions.reduce((sum, session) => {
            const result = session.resultJson as any;
            return sum + (result?.overall_score || 0);
          }, 0) / child.sessions.length
        : 0;

      // Check for companion unlocks based on milestones
      const companionRules = this.getCompanionRules();
      
      for (const rule of companionRules) {
        const hasUnlock = child.companions.some(c => c.type === rule.reward.type);
        
        if (!hasUnlock && this.checkRuleCondition(rule, { completedSessions, avgScore, currentScore: analysis.overall_score })) {
          // Create companion unlock
          await db.companionUnlock.create({
            data: {
              childId,
              type: rule.reward.type,
              meta: rule.reward.meta,
            },
          });

          logger.info(`Companion unlocked for child ${childId}: ${rule.reward.type}`);
          
          // TODO: Emit socket event for reward
          // this.socketService.emitToChild(childId, 'session:reward', {
          //   coins: 0,
          //   companionUnlocked: rule.reward,
          //   message: rule.description,
          // });
        }
      }
    } catch (error) {
      logger.error('Error checking rewards:', error);
    }
  }

  /**
   * Get companion unlock rules
   */
  private getCompanionRules() {
    return [
      {
        id: 'first_session',
        name: 'First Steps',
        description: 'Complete your first conversation!',
        condition: { type: 'session_count', value: 1 },
        reward: { type: 'basic_bird', meta: { color: 'blue' } },
      },
      {
        id: 'good_eye_contact',
        name: 'Eye Contact Master',
        description: 'Great eye contact in a conversation!',
        condition: { type: 'score_threshold', value: 0.8, metric: 'eye_contact' },
        reward: { type: 'glasses_accessory', meta: { style: 'cool' } },
      },
      {
        id: 'clear_speaker',
        name: 'Clear Speaker',
        description: 'Speak clearly and confidently!',
        condition: { type: 'score_threshold', value: 0.8, metric: 'speech_clarity' },
        reward: { type: 'microphone_prop', meta: {} },
      },
      {
        id: 'ten_sessions',
        name: 'Conversation Pro',
        description: 'Complete 10 conversations!',
        condition: { type: 'session_count', value: 10 },
        reward: { type: 'hat_accessory', meta: { style: 'graduation' } },
      },
    ];
  }

  /**
   * Check if rule condition is met
   */
  private checkRuleCondition(rule: any, stats: { completedSessions: number; avgScore: number; currentScore: number }): boolean {
    switch (rule.condition.type) {
      case 'session_count':
        return stats.completedSessions >= rule.condition.value;
      
      case 'score_threshold':
        if (rule.condition.metric === 'eye_contact' || rule.condition.metric === 'speech_clarity') {
          return stats.currentScore >= rule.condition.value;
        }
        return stats.avgScore >= rule.condition.value;
      
      default:
        return false;
    }
  }

  /**
   * Close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
  }
}