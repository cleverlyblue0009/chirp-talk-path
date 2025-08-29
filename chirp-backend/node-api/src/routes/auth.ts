import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const firebaseLoginSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
  role: z.enum(['KID', 'PARENT', 'THERAPIST', 'ADMIN']).optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
});

/**
 * @swagger
 * components:
 *   schemas:
 *     FirebaseLoginRequest:
 *       type: object
 *       required:
 *         - idToken
 *       properties:
 *         idToken:
 *           type: string
 *           description: Firebase ID token
 *         role:
 *           type: string
 *           enum: [KID, PARENT, THERAPIST, ADMIN]
 *           description: User role (for new users)
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Internal JWT token
 *         user:
 *           $ref: '#/components/schemas/User'
 *         expiresIn:
 *           type: string
 *           description: Token expiration time
 */

/**
 * @swagger
 * /auth/firebase-login:
 *   post:
 *     summary: Exchange Firebase token for internal session
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FirebaseLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid Firebase token
 */
router.post('/firebase-login', validate(firebaseLoginSchema), AuthController.firebaseLogin);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh internal token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.get('/profile', authenticateToken, AuthController.getProfile);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 */
router.put('/profile', authenticateToken, validate(updateProfileSchema), AuthController.updateProfile);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Authentication required
 */
router.post('/logout', authenticateToken, AuthController.logout);

export default router;