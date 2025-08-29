import { Request, Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { analysisQueue } from '../utils/redis';
import { StorageService } from '../services/storage';
import { SocketService } from '../sockets/socketService';
import { StartSessionRequest, StartSessionResponse, CompleteSessionRequest, CompleteSessionResponse, AnalysisJobPayload } from '../types';
import { JobStatus } from '@prisma/client';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video and audio files
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are allowed'));
    }
  },
});

export class SessionsController {
  static upload = upload;

  /**
   * Start a new session
   * POST /sessions
   */
  static async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { childId, scenarioId, moduleId }: StartSessionRequest = req.body;

      // Verify child access
      const child = await db.child.findFirst({
        where: {
          id: childId,
          OR: [
            { guardians: { some: { id: req.user.uid } } },
            { therapistId: req.user.uid },
          ],
        },
      });

      if (!child) {
        res.status(403).json({ error: 'Access denied to this child' });
        return;
      }

      // Verify scenario if provided
      if (scenarioId) {
        const scenario = await db.scenario.findUnique({
          where: { id: scenarioId },
        });

        if (!scenario) {
          res.status(404).json({ error: 'Scenario not found' });
          return;
        }
      }

      // Create session
      const session = await db.session.create({
        data: {
          childId,
          scenarioId,
          moduleId,
        },
      });

      logger.info(`Session started: ${session.id} for child ${childId}`);

      const response: StartSessionResponse = {
        sessionId: session.id,
        status: 'created',
      };

      res.status(201).json(response);

    } catch (error) {
      logger.error('Start session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Upload media for session
   * POST /sessions/:id/media
   */
  static async uploadSessionMedia(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;

      if (!req.file) {
        res.status(400).json({ error: 'No media file provided' });
        return;
      }

      // Verify session access
      const session = await db.session.findFirst({
        where: {
          id: sessionId,
          child: {
            OR: [
              { guardians: { some: { id: req.user.uid } } },
              { therapistId: req.user.uid },
            ],
          },
        },
        include: { child: true },
      });

      if (!session) {
        res.status(403).json({ error: 'Session not found or access denied' });
        return;
      }

      // Check media consent
      if (!session.child.consentMedia) {
        res.status(403).json({ error: 'Media upload not permitted - consent required' });
        return;
      }

      // Generate storage key
      const fileExtension = req.file.originalname.split('.').pop() || 'mp4';
      const mediaKey = StorageService.generateMediaKey(session.childId, sessionId, fileExtension);

      // Upload to storage
      await StorageService.uploadFile(
        req.file.buffer,
        req.file.mimetype,
        'media',
        mediaKey
      );

      // Update session with media reference
      await db.session.update({
        where: { id: sessionId },
        data: { mediaRef: mediaKey },
      });

      // Create analysis job
      const analysisJob = await db.analysisJob.create({
        data: {
          sessionId,
          childId: session.childId,
          status: JobStatus.PENDING,
        },
      });

      // Queue analysis job
      const jobPayload: AnalysisJobPayload = {
        sessionId,
        childId: session.childId,
        mediaRef: mediaKey,
        scenarioId: session.scenarioId || undefined,
        moduleId: session.moduleId || undefined,
      };

      await analysisQueue.add('analyze-media', jobPayload, {
        jobId: analysisJob.id,
        delay: 1000, // Small delay to ensure DB transaction is complete
      });

      logger.info(`Media uploaded for session ${sessionId}, analysis job queued: ${analysisJob.id}`);

      // Send immediate progress update via socket
      const socketService = SocketService.getInstance();
      if (socketService) {
        socketService.sendProgress(sessionId, 1, 15, 'Great! We received your recording and are analyzing it.');
      }

      res.json({
        message: 'Media uploaded successfully',
        mediaRef: mediaKey,
        analysisJobId: analysisJob.id,
        status: 'processing',
      });

    } catch (error) {
      logger.error('Upload session media error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Complete a session
   * POST /sessions/:id/complete
   */
  static async completeSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;
      const { resultJson }: CompleteSessionRequest = req.body;

      // Verify session access
      const session = await db.session.findFirst({
        where: {
          id: sessionId,
          child: {
            OR: [
              { guardians: { some: { id: req.user.uid } } },
              { therapistId: req.user.uid },
            ],
          },
        },
        include: {
          child: {
            include: {
              companions: true,
            },
          },
        },
      });

      if (!session) {
        res.status(403).json({ error: 'Session not found or access denied' });
        return;
      }

      if (session.completedAt) {
        res.status(400).json({ error: 'Session already completed' });
        return;
      }

      // Update session as completed
      const updatedSession = await db.session.update({
        where: { id: sessionId },
        data: {
          completedAt: new Date(),
          resultJson: resultJson || session.resultJson,
        },
      });

      // Calculate rewards (simple implementation)
      const rewards = this.calculateRewards(resultJson || session.resultJson);
      
      // Check for new companion unlocks
      const newUnlocks = await this.checkCompanionUnlocks(session.child);

      logger.info(`Session completed: ${sessionId}`);

      // Send completion notification via socket
      const socketService = SocketService.getInstance();
      if (socketService) {
        await socketService.handleSessionCompletion(sessionId, { rewards, unlocks: newUnlocks });
      }

      const response: CompleteSessionResponse = {
        sessionId,
        rewards,
        unlocks: newUnlocks,
      };

      res.json(response);

    } catch (error) {
      logger.error('Complete session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get session details
   * GET /sessions/:id
   */
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;

      const session = await db.session.findFirst({
        where: {
          id: sessionId,
          child: {
            OR: [
              { guardians: { some: { id: req.user.uid } } },
              { therapistId: req.user.uid },
            ],
          },
        },
        include: {
          child: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          scenario: {
            select: {
              id: true,
              title: true,
              difficulty: true,
            },
          },
          analysisJobs: {
            select: {
              id: true,
              status: true,
              resultJson: true,
              createdAt: true,
              finishedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Get media URL if available
      let mediaUrl = undefined;
      if (session.mediaRef) {
        try {
          mediaUrl = await StorageService.getPresignedUrl(session.mediaRef, 3600);
        } catch (error) {
          logger.warn(`Failed to generate media URL for session ${sessionId}:`, error);
        }
      }

      res.json({
        id: session.id,
        child: session.child,
        scenario: session.scenario,
        moduleId: session.moduleId,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        resultJson: session.resultJson,
        mediaUrl,
        analysisJobs: session.analysisJobs,
      });

    } catch (error) {
      logger.error('Get session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get sessions for a child
   * GET /sessions?childId=:childId
   */
  static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.query.childId as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!childId) {
        res.status(400).json({ error: 'childId query parameter required' });
        return;
      }

      // Verify child access
      const child = await db.child.findFirst({
        where: {
          id: childId,
          OR: [
            { guardians: { some: { id: req.user.uid } } },
            { therapistId: req.user.uid },
          ],
        },
      });

      if (!child) {
        res.status(403).json({ error: 'Access denied to this child' });
        return;
      }

      const sessions = await db.session.findMany({
        where: { childId },
        include: {
          scenario: {
            select: {
              id: true,
              title: true,
              difficulty: true,
            },
          },
          _count: {
            select: {
              analysisJobs: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const response = sessions.map(session => ({
        id: session.id,
        scenario: session.scenario,
        moduleId: session.moduleId,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        hasAnalysis: session._count.analysisJobs > 0,
        score: session.resultJson ? (session.resultJson as any).overall_score : null,
      }));

      res.json(response);

    } catch (error) {
      logger.error('Get sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Calculate rewards based on session results
   */
  private static calculateRewards(resultJson: any): any[] {
    if (!resultJson) return [];

    const rewards = [];
    const overallScore = resultJson.overall_score || 0;

    // Base coins for completion
    rewards.push({
      type: 'coins',
      amount: 10,
      reason: 'Session completed',
    });

    // Bonus coins for good performance
    if (overallScore > 0.7) {
      rewards.push({
        type: 'coins',
        amount: 15,
        reason: 'Great performance!',
      });
    } else if (overallScore > 0.5) {
      rewards.push({
        type: 'coins',
        amount: 5,
        reason: 'Good effort!',
      });
    }

    // XP rewards
    rewards.push({
      type: 'xp',
      amount: Math.round(overallScore * 100),
      reason: 'Conversation practice',
    });

    return rewards;
  }

  /**
   * Check for new companion unlocks
   */
  private static async checkCompanionUnlocks(child: any): Promise<any[]> {
    // This would integrate with the companion unlock logic from the analysis worker
    // For now, return empty array
    return [];
  }
}