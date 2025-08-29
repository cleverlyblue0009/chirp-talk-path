import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Validation error:', { errors, body: req.body });
        res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      } else {
        logger.error('Unexpected validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        res.status(400).json({
          error: 'Query validation failed',
          details: errors
        });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

/**
 * Validate route parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        res.status(400).json({
          error: 'Parameter validation failed',
          details: errors
        });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

// Common validation schemas
export const schemas = {
  // Child schemas
  createChild: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    dob: z.string().datetime().optional(),
    guardianIds: z.array(z.string().cuid()).min(1, 'At least one guardian required'),
    therapistId: z.string().cuid().optional(),
  }),

  // Session schemas
  startSession: z.object({
    childId: z.string().cuid('Invalid child ID'),
    scenarioId: z.string().cuid('Invalid scenario ID').optional(),
    moduleId: z.string().optional(),
  }),

  completeSession: z.object({
    resultJson: z.any(),
  }),

  // Assessment schemas
  submitAssessment: z.object({
    rawResults: z.any(),
  }),

  // Scenario schemas
  createScenario: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    tags: z.array(z.string()).default([]),
    difficulty: z.number().int().min(1).max(5).default(1),
    description: z.string().min(10, 'Description must be at least 10 characters'),
  }),

  generateScenario: z.object({
    text: z.string().min(10, 'Description must be at least 10 characters'),
    difficulty: z.number().int().min(1).max(5).optional(),
    tags: z.array(z.string()).optional(),
  }),

  // Common parameter schemas
  childIdParam: z.object({
    childId: z.string().cuid('Invalid child ID'),
  }),

  sessionIdParam: z.object({
    id: z.string().cuid('Invalid session ID'),
  }),

  scenarioIdParam: z.object({
    id: z.string().cuid('Invalid scenario ID'),
  }),

  // Query schemas
  dashboardQuery: z.object({
    days: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(365)).optional(),
  }),

  scenarioQuery: z.object({
    difficulty: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(5)).optional(),
    tags: z.string().optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(100)).optional(),
    offset: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(0)).optional(),
  }),
};