import { Router } from 'express';
import { ChildrenController } from '../controllers/childrenController';
import { authenticateToken, requireRole, requireChildAccess } from '../middleware/auth';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Child:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Child ID
 *         name:
 *           type: string
 *           description: Child's name
 *         level:
 *           type: integer
 *           description: Current skill level (1-5)
 *         dob:
 *           type: string
 *           format: date
 *           description: Date of birth
 *         consentMedia:
 *           type: boolean
 *           description: Media recording consent
 *         createdAt:
 *           type: string
 *           format: date-time
 *         guardians:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         therapist:
 *           $ref: '#/components/schemas/User'
 *     CreateChildRequest:
 *       type: object
 *       required:
 *         - name
 *         - guardianIds
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *         dob:
 *           type: string
 *           format: date-time
 *         guardianIds:
 *           type: array
 *           items:
 *             type: string
 *           minItems: 1
 *         therapistId:
 *           type: string
 *     DashboardResponse:
 *       type: object
 *       properties:
 *         lessonsCompleted:
 *           type: integer
 *         streak:
 *           type: integer
 *         avgScore:
 *           type: number
 *         practiceTime:
 *           type: integer
 *           description: Total practice time in minutes
 *         recentSessions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SessionSummary'
 *         companionsUnlocked:
 *           type: integer
 *         nextMilestone:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *             progress:
 *               type: integer
 *             target:
 *               type: integer
 */

/**
 * @swagger
 * /children:
 *   post:
 *     summary: Create a new child
 *     tags: [Children]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChildRequest'
 *     responses:
 *       201:
 *         description: Child created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Child'
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Insufficient permissions
 */
router.post('/', 
  authenticateToken,
  requireRole([Role.PARENT, Role.THERAPIST, Role.ADMIN]),
  validate(schemas.createChild),
  ChildrenController.createChild
);

/**
 * @swagger
 * /children:
 *   get:
 *     summary: Get children for current user
 *     tags: [Children]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of children
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Child'
 *       401:
 *         description: Authentication required
 */
router.get('/', authenticateToken, ChildrenController.getChildren);

/**
 * @swagger
 * /children/{id}/dashboard:
 *   get:
 *     summary: Get child dashboard data
 *     tags: [Children]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Number of days to include in dashboard
 *     responses:
 *       200:
 *         description: Child dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 *       403:
 *         description: Access denied to this child
 *       404:
 *         description: Child not found
 */
router.get('/:id/dashboard',
  authenticateToken,
  validateParams(schemas.childIdParam),
  validateQuery(schemas.dashboardQuery),
  requireChildAccess,
  ChildrenController.getChildDashboard
);

/**
 * @swagger
 * /children/{id}:
 *   put:
 *     summary: Update child information
 *     tags: [Children]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               dob:
 *                 type: string
 *                 format: date-time
 *               therapistId:
 *                 type: string
 *               consentMedia:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Child updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Child'
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Access denied to this child
 *       404:
 *         description: Child not found
 */
router.put('/:id',
  authenticateToken,
  validateParams(schemas.childIdParam),
  requireChildAccess,
  ChildrenController.updateChild
);

/**
 * @swagger
 * /children/{id}/data:
 *   delete:
 *     summary: Delete child and all associated data
 *     tags: [Children]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *     responses:
 *       200:
 *         description: Child data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedChildId:
 *                   type: string
 *       403:
 *         description: Access denied
 *       404:
 *         description: Child not found
 */
router.delete('/:id/data',
  authenticateToken,
  validateParams(schemas.childIdParam),
  ChildrenController.deleteChildData
);

export default router;