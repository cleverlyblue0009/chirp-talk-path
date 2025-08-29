import { Request, Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { StorageService } from '../services/storage';
import { Role } from '@prisma/client';

export class MediaController {
  /**
   * Delete media file (right to delete)
   * DELETE /media/:mediaKey
   */
  static async deleteMedia(req: Request, res: Response): Promise<void> {
    try {
      const mediaKey = req.params.mediaKey;

      // Find the session that owns this media
      const session = await db.session.findFirst({
        where: { mediaRef: mediaKey },
        include: {
          child: {
            include: {
              guardians: { select: { id: true } },
            },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Media file not found' });
        return;
      }

      // Check permissions
      const hasAccess = req.user.role === Role.ADMIN ||
        session.child.guardians.some(guardian => guardian.id === req.user.uid) ||
        session.child.therapistId === req.user.uid;

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to delete this media' });
        return;
      }

      try {
        // Delete from storage
        await StorageService.deleteFile(mediaKey);
      } catch (storageError) {
        logger.warn(`Failed to delete media file from storage: ${mediaKey}`, storageError);
        // Continue with database cleanup even if storage deletion fails
      }

      // Update session to remove media reference
      await db.session.update({
        where: { id: session.id },
        data: { mediaRef: null },
      });

      // Update related analysis jobs
      await db.analysisJob.updateMany({
        where: { sessionId: session.id },
        data: { 
          status: 'FAILED',
          errorMessage: 'Media file deleted by user',
        },
      });

      logger.info(`Media deleted: ${mediaKey} by user ${req.user.uid}`);

      res.json({
        message: 'Media file deleted successfully',
        mediaKey,
        sessionId: session.id,
      });

    } catch (error) {
      logger.error('Delete media error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get media file URL (with access control)
   * GET /media/:mediaKey
   */
  static async getMedia(req: Request, res: Response): Promise<void> {
    try {
      const mediaKey = req.params.mediaKey;
      const expiresIn = parseInt(req.query.expires as string) || 3600; // 1 hour default

      // Find the session that owns this media
      const session = await db.session.findFirst({
        where: { mediaRef: mediaKey },
        include: {
          child: {
            include: {
              guardians: { select: { id: true } },
            },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Media file not found' });
        return;
      }

      // Check permissions
      const hasAccess = req.user.role === Role.ADMIN ||
        session.child.guardians.some(guardian => guardian.id === req.user.uid) ||
        session.child.therapistId === req.user.uid;

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to this media' });
        return;
      }

      try {
        // Generate presigned URL
        const mediaUrl = await StorageService.getPresignedUrl(mediaKey, expiresIn);

        res.json({
          mediaUrl,
          expiresIn,
          mediaKey,
          sessionId: session.id,
        });

      } catch (storageError) {
        logger.error(`Failed to generate media URL for ${mediaKey}:`, storageError);
        res.status(404).json({ error: 'Media file not accessible' });
      }

    } catch (error) {
      logger.error('Get media error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * List media files for a child (admin/therapist only)
   * GET /media?childId=:childId
   */
  static async listMedia(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.query.childId as string;

      if (!childId) {
        res.status(400).json({ error: 'childId query parameter required' });
        return;
      }

      // Only therapists and admins can list media files
      if (req.user.role !== Role.THERAPIST && req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Verify child access for therapists
      if (req.user.role === Role.THERAPIST) {
        const child = await db.child.findFirst({
          where: {
            id: childId,
            therapistId: req.user.uid,
          },
        });

        if (!child) {
          res.status(403).json({ error: 'Access denied to this child' });
          return;
        }
      }

      // Get sessions with media files
      const sessions = await db.session.findMany({
        where: {
          childId,
          mediaRef: { not: null },
        },
        include: {
          scenario: { select: { title: true } },
          analysisJobs: {
            select: { status: true, resultJson: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      const mediaFiles = await Promise.all(
        sessions.map(async (session) => {
          try {
            const metadata = await StorageService.getFileMetadata(session.mediaRef!);
            
            return {
              mediaKey: session.mediaRef,
              sessionId: session.id,
              scenarioTitle: session.scenario?.title || 'Practice Session',
              uploadedAt: session.startedAt.toISOString(),
              size: metadata.ContentLength,
              contentType: metadata.ContentType,
              analysisStatus: session.analysisJobs[0]?.status || 'PENDING',
              hasResults: !!session.analysisJobs[0]?.resultJson,
            };
          } catch (error) {
            logger.warn(`Failed to get metadata for media ${session.mediaRef}:`, error);
            return {
              mediaKey: session.mediaRef,
              sessionId: session.id,
              scenarioTitle: session.scenario?.title || 'Practice Session',
              uploadedAt: session.startedAt.toISOString(),
              size: null,
              contentType: null,
              analysisStatus: session.analysisJobs[0]?.status || 'PENDING',
              hasResults: !!session.analysisJobs[0]?.resultJson,
              error: 'Metadata unavailable',
            };
          }
        })
      );

      res.json({
        childId,
        mediaFiles,
        totalFiles: mediaFiles.length,
      });

    } catch (error) {
      logger.error('List media error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Cleanup expired media files (admin only)
   * POST /media/cleanup
   */
  static async cleanupExpiredMedia(req: Request, res: Response): Promise<void> {
    try {
      // Only admins can run cleanup
      if (req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const retentionDays = parseInt(req.body.retentionDays || process.env.ANALYSIS_CONSENT_RETENTION_DAYS || '365');

      // Find sessions with expired media
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const expiredSessions = await db.session.findMany({
        where: {
          mediaRef: { not: null },
          startedAt: { lt: cutoffDate },
        },
        include: {
          child: { select: { consentMedia: true } },
        },
      });

      let deletedCount = 0;
      const errors: string[] = [];

      for (const session of expiredSessions) {
        try {
          // Delete from storage
          await StorageService.deleteFile(session.mediaRef!);

          // Update session
          await db.session.update({
            where: { id: session.id },
            data: { mediaRef: null },
          });

          // Update analysis jobs
          await db.analysisJob.updateMany({
            where: { sessionId: session.id },
            data: { 
              status: 'FAILED',
              errorMessage: 'Media file expired and deleted',
            },
          });

          deletedCount++;
          logger.info(`Expired media cleaned up: ${session.mediaRef}`);

        } catch (error) {
          const errorMsg = `Failed to cleanup ${session.mediaRef}: ${error}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      res.json({
        message: 'Media cleanup completed',
        deletedCount,
        totalExpired: expiredSessions.length,
        retentionDays,
        errors: errors.length > 0 ? errors : undefined,
      });

    } catch (error) {
      logger.error('Cleanup expired media error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get media storage statistics (admin only)
   * GET /media/stats
   */
  static async getMediaStats(req: Request, res: Response): Promise<void> {
    try {
      // Only admins can view stats
      if (req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      // Get database stats
      const totalSessions = await db.session.count({
        where: { mediaRef: { not: null } },
      });

      const sessionsByChild = await db.session.groupBy({
        by: ['childId'],
        where: { mediaRef: { not: null } },
        _count: { mediaRef: true },
      });

      // Get recent upload activity
      const recentUploads = await db.session.findMany({
        where: {
          mediaRef: { not: null },
          startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
        include: {
          child: { select: { name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      });

      try {
        // Get storage stats (this might be expensive for large buckets)
        const storageFiles = await StorageService.listFiles('media/', 1000);
        
        const totalFiles = storageFiles.length;
        const totalSize = storageFiles.reduce((sum, file) => sum + (file.Size || 0), 0);

        res.json({
          database: {
            totalSessions: totalSessions,
            childrenWithMedia: sessionsByChild.length,
            averageSessionsPerChild: sessionsByChild.length > 0 
              ? totalSessions / sessionsByChild.length 
              : 0,
          },
          storage: {
            totalFiles,
            totalSizeBytes: totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024)),
          },
          recentActivity: recentUploads.map(session => ({
            sessionId: session.id,
            childName: session.child.name,
            uploadedAt: session.startedAt.toISOString(),
            mediaKey: session.mediaRef,
          })),
        });

      } catch (storageError) {
        logger.warn('Failed to get storage stats:', storageError);
        
        res.json({
          database: {
            totalSessions: totalSessions,
            childrenWithMedia: sessionsByChild.length,
            averageSessionsPerChild: sessionsByChild.length > 0 
              ? totalSessions / sessionsByChild.length 
              : 0,
          },
          storage: {
            error: 'Storage stats unavailable',
          },
          recentActivity: recentUploads.map(session => ({
            sessionId: session.id,
            childName: session.child.name,
            uploadedAt: session.startedAt.toISOString(),
            mediaKey: session.mediaRef,
          })),
        });
      }

    } catch (error) {
      logger.error('Get media stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}