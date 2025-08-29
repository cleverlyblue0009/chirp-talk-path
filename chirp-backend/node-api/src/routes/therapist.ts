import { Router } from 'express';
import { ScenariosController } from '../controllers/scenariosController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @swagger
 * /therapist/scenario/generate:
 *   post:
 *     summary: Generate scenario preview (therapist only)
 *     tags: [Therapist]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateScenarioRequest'
 *     responses:
 *       200:
 *         description: Scenario generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scriptJson:
 *                   type: object
 *                   description: Generated conversation script
 *                 rubricJson:
 *                   type: object
 *                   description: Generated scoring rubric
 *                 preview:
 *                   type: string
 *                   description: Preview text of the scenario
 *       403:
 *         description: Insufficient permissions (therapist/admin only)
 *       500:
 *         description: Failed to generate scenario
 */
router.post('/scenario/generate',
  authenticateToken,
  requireRole([Role.THERAPIST, Role.ADMIN]),
  validate(schemas.generateScenario),
  ScenariosController.generateScenarioPreview
);

/**
 * @swagger
 * /therapist/clients:
 *   get:
 *     summary: Get therapist's assigned clients
 *     tags: [Therapist]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned children
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   level:
 *                     type: integer
 *                   dob:
 *                     type: string
 *                     format: date
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   guardians:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         displayName:
 *                           type: string
 *                   sessionsCompleted:
 *                     type: integer
 *                   companionsUnlocked:
 *                     type: integer
 *                   lastActive:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: Insufficient permissions (therapist/admin only)
 */
router.get('/clients', 
  authenticateToken,
  requireRole([Role.THERAPIST, Role.ADMIN]),
  async (req, res) => {
    try {
      const { db } = await import('../utils/database');
      
      let children;
      
      if (req.user.role === Role.ADMIN) {
        // Admin can see all children
        children = await db.child.findMany({
          include: {
            guardians: {
              select: { id: true, email: true, displayName: true },
            },
            sessions: {
              where: { completedAt: { not: null } },
              select: { completedAt: true },
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                sessions: { where: { completedAt: { not: null } } },
                companions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        // Therapist can see assigned children
        children = await db.child.findMany({
          where: { therapistId: req.user.uid },
          include: {
            guardians: {
              select: { id: true, email: true, displayName: true },
            },
            sessions: {
              where: { completedAt: { not: null } },
              select: { completedAt: true },
              orderBy: { completedAt: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                sessions: { where: { completedAt: { not: null } } },
                companions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      const response = children.map(child => ({
        id: child.id,
        name: child.name,
        level: child.level,
        dob: child.dob?.toISOString().split('T')[0],
        createdAt: child.createdAt.toISOString(),
        guardians: child.guardians,
        sessionsCompleted: child._count.sessions,
        companionsUnlocked: child._count.companions,
        lastActive: child.sessions[0]?.completedAt?.toISOString() || null,
      }));

      res.json(response);
    } catch (error) {
      console.error('Get therapist clients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;