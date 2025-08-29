import { Router } from 'express';
import { SessionsController } from '../controllers/sessionsController';
import { authenticateToken, requireChildAccess } from '../middleware/auth';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Session:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         child:
 *           $ref: '#/components/schemas/Child'
 *         scenario:
 *           $ref: '#/components/schemas/Scenario'
 *         moduleId:
 *           type: string
 *         startedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         resultJson:
 *           type: object
 *         mediaUrl:
 *           type: string
 *         analysisJobs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AnalysisJob'
 *     StartSessionRequest:
 *       type: object
 *       required:
 *         - childId
 *       properties:
 *         childId:
 *           type: string
 *         scenarioId:
 *           type: string
 *         moduleId:
 *           type: string
 *     CompleteSessionRequest:
 *       type: object
 *       properties:
 *         resultJson:
 *           type: object
 *     SessionSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         scenario:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             title:
 *               type: string
 *             difficulty:
 *               type: integer
 *         moduleId:
 *           type: string
 *         startedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         hasAnalysis:
 *           type: boolean
 *         score:
 *           type: number
 */

/**
 * @swagger
 * /sessions:
 *   post:
 *     summary: Start a new session
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartSessionRequest'
 *     responses:
 *       201:
 *         description: Session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   example: created
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Access denied to child
 *       404:
 *         description: Child or scenario not found
 */
router.post('/',
  authenticateToken,
  validate(schemas.startSession),
  SessionsController.startSession
);

/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: Get sessions for a child
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: Child ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SessionSummary'
 *       400:
 *         description: Missing childId parameter
 *       403:
 *         description: Access denied to child
 */
router.get('/', authenticateToken, SessionsController.getSessions);

/**
 * @swagger
 * /sessions/{id}:
 *   get:
 *     summary: Get session details
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Session not found
 */
router.get('/:id',
  authenticateToken,
  validateParams(schemas.sessionIdParam),
  SessionsController.getSession
);

/**
 * @swagger
 * /sessions/{id}/media:
 *   post:
 *     summary: Upload media for session
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Video or audio file
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 mediaRef:
 *                   type: string
 *                 analysisJobId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   example: processing
 *       400:
 *         description: No file provided or invalid file type
 *       403:
 *         description: Access denied or consent required
 *       404:
 *         description: Session not found
 */
router.post('/:id/media',
  authenticateToken,
  validateParams(schemas.sessionIdParam),
  SessionsController.upload.single('file'),
  SessionsController.uploadSessionMedia
);

/**
 * @swagger
 * /sessions/{id}/complete:
 *   post:
 *     summary: Complete a session
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteSessionRequest'
 *     responses:
 *       200:
 *         description: Session completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 rewards:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       reason:
 *                         type: string
 *                 unlocks:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Session already completed
 *       403:
 *         description: Access denied
 *       404:
 *         description: Session not found
 */
router.post('/:id/complete',
  authenticateToken,
  validateParams(schemas.sessionIdParam),
  validate(schemas.completeSession),
  SessionsController.completeSession
);

export default router;