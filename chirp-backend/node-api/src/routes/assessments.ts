import { Router } from 'express';
import { AssessmentsController } from '../controllers/assessmentsController';
import { authenticateToken, requireChildAccess } from '../middleware/auth';
import { validate, validateParams, schemas } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Assessment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         childId:
 *           type: string
 *         level:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         completedAt:
 *           type: string
 *           format: date-time
 *         strengths:
 *           type: array
 *           items:
 *             type: string
 *         areasForGrowth:
 *           type: array
 *           items:
 *             type: string
 *         recommendedModules:
 *           type: array
 *           items:
 *             type: string
 *         rawResults:
 *           type: object
 *           description: Only visible to therapists and admins
 *     AssessmentQuestion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [multiple_choice, scenario, media_response]
 *         question:
 *           type: string
 *         options:
 *           type: array
 *           items:
 *             type: string
 *         mediaUrl:
 *           type: string
 *     AssessmentSubmitRequest:
 *       type: object
 *       required:
 *         - rawResults
 *       properties:
 *         rawResults:
 *           type: object
 *           description: Assessment responses and data
 */

/**
 * @swagger
 * /assessments/{childId}/start:
 *   post:
 *     summary: Start assessment for a child
 *     tags: [Assessments]
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
 *         description: Assessment started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assessmentId:
 *                   type: string
 *                 questions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssessmentQuestion'
 *       400:
 *         description: Assessment already completed for this child
 *       403:
 *         description: Access denied to this child
 *       404:
 *         description: Child not found
 */
router.post('/:childId/start',
  authenticateToken,
  validateParams(schemas.childIdParam),
  requireChildAccess,
  AssessmentsController.startAssessment
);

/**
 * @swagger
 * /assessments/{id}/submit:
 *   post:
 *     summary: Submit assessment results
 *     tags: [Assessments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssessmentSubmitRequest'
 *     responses:
 *       200:
 *         description: Assessment submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 level:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 5
 *                 strengths:
 *                   type: array
 *                   items:
 *                     type: string
 *                 areasForGrowth:
 *                   type: array
 *                   items:
 *                     type: string
 *                 recommendedModules:
 *                   type: array
 *                   items:
 *                     type: string
 *       403:
 *         description: Access denied to this child
 *       404:
 *         description: Child not found
 */
router.post('/:id/submit',
  authenticateToken,
  validate(schemas.submitAssessment),
  AssessmentsController.submitAssessment
);

/**
 * @swagger
 * /assessments/{childId}:
 *   get:
 *     summary: Get assessment results
 *     tags: [Assessments]
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
 *         description: Assessment results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assessment'
 *       403:
 *         description: Access denied to this child
 *       404:
 *         description: No assessment found for this child
 */
router.get('/:childId',
  authenticateToken,
  validateParams(schemas.childIdParam),
  requireChildAccess,
  AssessmentsController.getAssessment
);

export default router;