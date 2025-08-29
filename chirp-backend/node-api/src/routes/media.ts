import { Router } from 'express';
import { MediaController } from '../controllers/mediaController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MediaFile:
 *       type: object
 *       properties:
 *         mediaKey:
 *           type: string
 *         sessionId:
 *           type: string
 *         scenarioTitle:
 *           type: string
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         size:
 *           type: integer
 *           description: File size in bytes
 *         contentType:
 *           type: string
 *         analysisStatus:
 *           type: string
 *           enum: [PENDING, RUNNING, DONE, FAILED]
 *         hasResults:
 *           type: boolean
 */

/**
 * @swagger
 * /media/{mediaKey}:
 *   get:
 *     summary: Get media file URL (with access control)
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Media file key
 *       - in: query
 *         name: expires
 *         schema:
 *           type: integer
 *           default: 3600
 *         description: URL expiration time in seconds
 *     responses:
 *       200:
 *         description: Media file URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mediaUrl:
 *                   type: string
 *                 expiresIn:
 *                   type: integer
 *                 mediaKey:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *       403:
 *         description: Access denied to this media
 *       404:
 *         description: Media file not found or not accessible
 */
router.get('/:mediaKey', authenticateToken, MediaController.getMedia);

/**
 * @swagger
 * /media/{mediaKey}:
 *   delete:
 *     summary: Delete media file (right to delete)
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Media file key
 *     responses:
 *       200:
 *         description: Media file deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 mediaKey:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *       403:
 *         description: Access denied to delete this media
 *       404:
 *         description: Media file not found
 */
router.delete('/:mediaKey', authenticateToken, MediaController.deleteMedia);

/**
 * @swagger
 * /media:
 *   get:
 *     summary: List media files for a child (admin/therapist only)
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *     responses:
 *       200:
 *         description: List of media files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 childId:
 *                   type: string
 *                 mediaFiles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MediaFile'
 *                 totalFiles:
 *                   type: integer
 *       400:
 *         description: Missing childId parameter
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', 
  authenticateToken, 
  requireRole([Role.THERAPIST, Role.ADMIN]),
  MediaController.listMedia
);

/**
 * @swagger
 * /media/cleanup:
 *   post:
 *     summary: Cleanup expired media files (admin only)
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               retentionDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3650
 *                 description: Files older than this will be deleted
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *                 totalExpired:
 *                   type: integer
 *                 retentionDays:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       403:
 *         description: Admin access required
 */
router.post('/cleanup',
  authenticateToken,
  requireRole(Role.ADMIN),
  MediaController.cleanupExpiredMedia
);

/**
 * @swagger
 * /media/stats:
 *   get:
 *     summary: Get media storage statistics (admin only)
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Media storage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 database:
 *                   type: object
 *                   properties:
 *                     totalSessions:
 *                       type: integer
 *                     childrenWithMedia:
 *                       type: integer
 *                     averageSessionsPerChild:
 *                       type: number
 *                 storage:
 *                   type: object
 *                   properties:
 *                     totalFiles:
 *                       type: integer
 *                     totalSizeBytes:
 *                       type: integer
 *                     totalSizeMB:
 *                       type: integer
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sessionId:
 *                         type: string
 *                       childName:
 *                         type: string
 *                       uploadedAt:
 *                         type: string
 *                         format: date-time
 *                       mediaKey:
 *                         type: string
 *       403:
 *         description: Admin access required
 */
router.get('/stats',
  authenticateToken,
  requireRole(Role.ADMIN),
  MediaController.getMediaStats
);

export default router;