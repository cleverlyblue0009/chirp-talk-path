import { Router } from 'express';
import { ScenariosController } from '../controllers/scenariosController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validation';
import { Role } from '@prisma/client';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Scenario:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         difficulty:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         scriptJson:
 *           type: object
 *           description: Conversation script and flow
 *         rubricJson:
 *           type: object
 *           description: Scoring rubric and criteria
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreateScenarioRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 200
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         difficulty:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           default: 1
 *         description:
 *           type: string
 *           minLength: 10
 *     GenerateScenarioRequest:
 *       type: object
 *       required:
 *         - text
 *       properties:
 *         text:
 *           type: string
 *           minLength: 10
 *         difficulty:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         tags:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /scenarios:
 *   post:
 *     summary: Create a new scenario
 *     tags: [Scenarios]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateScenarioRequest'
 *     responses:
 *       201:
 *         description: Scenario created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Scenario'
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Insufficient permissions (therapist/admin only)
 */
router.post('/',
  authenticateToken,
  requireRole([Role.THERAPIST, Role.ADMIN]),
  validate(schemas.createScenario),
  ScenariosController.createScenario
);

/**
 * @swagger
 * /scenarios:
 *   get:
 *     summary: Get scenarios list with filtering
 *     tags: [Scenarios]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by difficulty level
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
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
 *         description: List of scenarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   difficulty:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   createdBy:
 *                     type: object
 *                   usageCount:
 *                     type: integer
 */
router.get('/',
  authenticateToken,
  validateQuery(schemas.scenarioQuery),
  ScenariosController.getScenarios
);

/**
 * @swagger
 * /scenarios/{id}:
 *   get:
 *     summary: Get scenario by ID
 *     tags: [Scenarios]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scenario ID
 *     responses:
 *       200:
 *         description: Scenario details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Scenario'
 *       404:
 *         description: Scenario not found
 */
router.get('/:id',
  authenticateToken,
  validateParams(schemas.scenarioIdParam),
  ScenariosController.getScenario
);

/**
 * @swagger
 * /scenarios/{id}:
 *   put:
 *     summary: Update scenario
 *     tags: [Scenarios]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scenario ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               difficulty:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               scriptJson:
 *                 type: object
 *               rubricJson:
 *                 type: object
 *     responses:
 *       200:
 *         description: Scenario updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Scenario'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Scenario not found
 */
router.put('/:id',
  authenticateToken,
  validateParams(schemas.scenarioIdParam),
  ScenariosController.updateScenario
);

/**
 * @swagger
 * /scenarios/{id}:
 *   delete:
 *     summary: Delete scenario
 *     tags: [Scenarios]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Scenario ID
 *     responses:
 *       200:
 *         description: Scenario deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedScenarioId:
 *                   type: string
 *       400:
 *         description: Cannot delete scenario that has been used
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Scenario not found
 */
router.delete('/:id',
  authenticateToken,
  validateParams(schemas.scenarioIdParam),
  ScenariosController.deleteScenario
);

export default router;