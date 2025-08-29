import { Router } from 'express';
import { AnalysisController } from '../controllers/analysisController';
import { authenticateToken, requireRole, requireChildAccess } from '../middleware/auth';
import { validateParams, validateQuery, schemas } from '../middleware/validation';
import { Role } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// Additional validation schemas
const trendsQuery = z.object({
  days: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(365)).optional(),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ChildSummaryReport:
 *       type: object
 *       properties:
 *         childId:
 *           type: string
 *         name:
 *           type: string
 *         totalSessions:
 *           type: integer
 *         avgScore:
 *           type: number
 *         practiceMinutes:
 *           type: integer
 *         strengthAreas:
 *           type: array
 *           items:
 *             type: string
 *         improvementAreas:
 *           type: array
 *           items:
 *             type: string
 *         recentProgress:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               score:
 *                 type: number
 *               activity:
 *                 type: string
 *         companionsEarned:
 *           type: integer
 *         currentStreak:
 *           type: integer
 *         lastActive:
 *           type: string
 *           format: date-time
 *     ClinicalReport:
 *       allOf:
 *         - $ref: '#/components/schemas/ChildSummaryReport'
 *         - type: object
 *           properties:
 *             detailedMetrics:
 *               type: object
 *               properties:
 *                 eyeContactTrend:
 *                   type: array
 *                   items:
 *                     type: number
 *                 speechClarityTrend:
 *                   type: array
 *                   items:
 *                     type: number
 *                 prosodyTrend:
 *                   type: array
 *                   items:
 *                     type: number
 *                 engagementTrend:
 *                   type: array
 *                   items:
 *                     type: number
 *             sessionBreakdown:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sessionId:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date
 *                   scenario:
 *                     type: string
 *                   rawScores:
 *                     type: object
 *                   clinicalNotes:
 *                     type: array
 *                     items:
 *                       type: string
 *             recommendations:
 *               type: array
 *               items:
 *                 type: string
 *             goalProgress:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   goal:
 *                     type: string
 *                   progress:
 *                     type: integer
 *                   target:
 *                     type: integer
 */

/**
 * @swagger
 * /analysis/{childId}/summary:
 *   get:
 *     summary: Get parent-friendly analysis summary
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *     responses:
 *       200:
 *         description: Child analysis summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChildSummaryReport'
 *       403:
 *         description: Access denied to this child
 *       404:
 *         description: Child not found
 */
router.get('/:childId/summary',
  authenticateToken,
  validateParams(schemas.childIdParam),
  requireChildAccess,
  AnalysisController.getChildSummary
);

/**
 * @swagger
 * /analysis/{childId}/clinical:
 *   get:
 *     summary: Get detailed clinical report (therapist only)
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *     responses:
 *       200:
 *         description: Detailed clinical report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClinicalReport'
 *       403:
 *         description: Insufficient permissions (therapist/admin only)
 *       404:
 *         description: Child not found
 */
router.get('/:childId/clinical',
  authenticateToken,
  validateParams(schemas.childIdParam),
  requireRole([Role.THERAPIST, Role.ADMIN]),
  AnalysisController.getClinicalReport
);

/**
 * @swagger
 * /analysis/{childId}/trends:
 *   get:
 *     summary: Get analysis trends over time
 *     tags: [Analysis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to include in trends
 *     responses:
 *       200:
 *         description: Analysis trends data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 childId:
 *                   type: string
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date
 *                     end:
 *                       type: string
 *                       format: date
 *                 trends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       overallScore:
 *                         type: number
 *                       eyeContactScore:
 *                         type: number
 *                       speechClarity:
 *                         type: number
 *                       prosodyScore:
 *                         type: number
 *                       engagementLevel:
 *                         type: number
 *                 totalSessions:
 *                   type: integer
 *       403:
 *         description: Access denied to this child
 *       404:
 *         description: Child not found
 */
router.get('/:childId/trends',
  authenticateToken,
  validateParams(schemas.childIdParam),
  validateQuery(trendsQuery),
  requireChildAccess,
  AnalysisController.getAnalysisTrends
);

export default router;