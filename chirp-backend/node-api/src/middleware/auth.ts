import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { AuthenticatedUser, Role } from '../types';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

/**
 * Middleware to verify Firebase token and attach user to request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user from database
    const user = await db.user.findUnique({
      where: { email: decodedToken.email! },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found in system' });
      return;
    }

    // Attach user to request
    req.user = {
      uid: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName || undefined,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (roles: Role | Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user can access child data
 */
export const requireChildAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const childId = req.params.childId || req.params.id;
    
    if (!childId) {
      res.status(400).json({ error: 'Child ID required' });
      return;
    }

    // Admin can access all
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    // Check if user has access to this child
    const child = await db.child.findFirst({
      where: {
        id: childId,
        OR: [
          // Parent access
          {
            guardians: {
              some: { id: req.user.uid }
            }
          },
          // Therapist access
          {
            therapistId: req.user.uid
          }
        ]
      }
    });

    if (!child) {
      res.status(403).json({ error: 'Access denied to this child' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Child access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Optional authentication - attach user if token present but don't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    const user = await db.user.findUnique({
      where: { email: decodedToken.email! },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
      },
    });

    if (user) {
      req.user = {
        uid: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName || undefined,
      };
    }

    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};