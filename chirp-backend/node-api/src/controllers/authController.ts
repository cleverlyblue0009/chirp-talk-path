import { Request, Response } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { Role } from '@prisma/client';

export class AuthController {
  /**
   * Exchange Firebase token for internal session
   * POST /auth/firebase-login
   */
  static async firebaseLogin(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, role } = req.body;

      if (!idToken) {
        res.status(400).json({ error: 'Firebase ID token required' });
        return;
      }

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, name, uid } = decodedToken;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      // Check if user exists or create new user
      let user = await db.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create new user
        const userRole = role && Object.values(Role).includes(role) ? role : Role.PARENT;
        
        user = await db.user.create({
          data: {
            email,
            role: userRole,
            displayName: name || email.split('@')[0],
          },
        });

        logger.info(`New user created: ${user.id} (${user.email})`);
      }

      // Generate internal JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const internalToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Update last login (optional)
      await db.user.update({
        where: { id: user.id },
        data: { 
          // Add lastLoginAt field to schema if needed
        },
      });

      res.json({
        token: internalToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
        expiresIn: '24h',
      });

    } catch (error) {
      logger.error('Firebase login error:', error);
      
      if (error instanceof Error && error.message.includes('Firebase')) {
        res.status(401).json({ error: 'Invalid Firebase token' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Refresh internal token
   * POST /auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtSecret) as any;
      
      // Get updated user data
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Generate new token
      const newToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
        expiresIn: '24h',
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  /**
   * Get current user profile
   * GET /auth/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await db.user.findUnique({
        where: { id: req.user.uid },
        include: {
          children: {
            select: {
              id: true,
              name: true,
              level: true,
              createdAt: true,
            },
          },
          assignedChildren: {
            select: {
              id: true,
              name: true,
              level: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        createdAt: user.createdAt,
        children: user.children,
        assignedChildren: user.assignedChildren,
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update user profile
   * PUT /auth/profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { displayName } = req.body;

      const user = await db.user.update({
        where: { id: req.user.uid },
        data: {
          displayName: displayName || undefined,
        },
      });

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        createdAt: user.createdAt,
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Logout (invalidate token on client side)
   * POST /auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a more sophisticated setup, you might maintain a token blacklist
      // For now, we'll just return success and let the client handle token removal
      
      logger.info(`User ${req.user.uid} logged out`);
      
      res.json({ 
        message: 'Logged out successfully',
        success: true 
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}