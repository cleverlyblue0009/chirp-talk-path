import { Request, Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { CreateChildRequest, CreateChildResponse, DashboardResponse } from '../types';
import { Role } from '@prisma/client';

export class ChildrenController {
  /**
   * Create a new child
   * POST /children
   */
  static async createChild(req: Request, res: Response): Promise<void> {
    try {
      const { name, dob, guardianIds, therapistId }: CreateChildRequest = req.body;

      // Verify user has permission to create children
      if (req.user.role !== Role.PARENT && req.user.role !== Role.THERAPIST && req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Insufficient permissions to create child' });
        return;
      }

      // Verify guardians exist
      const guardians = await db.user.findMany({
        where: {
          id: { in: guardianIds },
          role: { in: [Role.PARENT, Role.ADMIN] },
        },
      });

      if (guardians.length !== guardianIds.length) {
        res.status(400).json({ error: 'One or more guardian IDs are invalid' });
        return;
      }

      // Verify therapist exists if provided
      if (therapistId) {
        const therapist = await db.user.findUnique({
          where: { id: therapistId, role: Role.THERAPIST },
        });

        if (!therapist) {
          res.status(400).json({ error: 'Invalid therapist ID' });
          return;
        }
      }

      // Create child
      const child = await db.child.create({
        data: {
          name,
          dob: dob ? new Date(dob) : undefined,
          therapistId,
          guardians: {
            connect: guardianIds.map(id => ({ id })),
          },
        },
        include: {
          guardians: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          therapist: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

      logger.info(`Child created: ${child.id} by user ${req.user.uid}`);

      const response: CreateChildResponse = {
        id: child.id,
        name: child.name,
        level: child.level,
        createdAt: child.createdAt.toISOString(),
      };

      res.status(201).json(response);

    } catch (error) {
      logger.error('Create child error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get child dashboard data
   * GET /children/:id/dashboard
   */
  static async getChildDashboard(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.params.id;
      const days = parseInt(req.query.days as string) || 30;

      // Get child with recent sessions
      const child = await db.child.findUnique({
        where: { id: childId },
        include: {
          sessions: {
            where: {
              completedAt: {
                not: null,
                gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
              },
            },
            orderBy: { completedAt: 'desc' },
            include: {
              scenario: {
                select: { title: true },
              },
            },
          },
          companions: true,
        },
      });

      if (!child) {
        res.status(404).json({ error: 'Child not found' });
        return;
      }

      // Calculate dashboard metrics
      const completedSessions = child.sessions.filter(s => s.completedAt);
      const lessonsCompleted = completedSessions.length;

      // Calculate average score
      const avgScore = completedSessions.length > 0
        ? completedSessions.reduce((sum, session) => {
            const result = session.resultJson as any;
            return sum + (result?.overall_score || 0);
          }, 0) / completedSessions.length
        : 0;

      // Calculate practice time (estimated)
      const practiceTime = completedSessions.reduce((total, session) => {
        if (session.completedAt && session.startedAt) {
          const duration = (session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60);
          return total + Math.min(duration, 30); // Cap at 30 minutes per session
        }
        return total + 10; // Default 10 minutes if no completion time
      }, 0);

      // Calculate streak (consecutive days with sessions)
      const streak = this.calculateStreak(completedSessions);

      // Recent sessions summary
      const recentSessions = completedSessions.slice(0, 5).map(session => ({
        id: session.id,
        scenarioTitle: session.scenario?.title || 'Practice Session',
        completedAt: session.completedAt!.toISOString(),
        score: (session.resultJson as any)?.overall_score || 0,
        duration: session.completedAt && session.startedAt
          ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60))
          : 10,
      }));

      // Next milestone calculation
      const nextMilestone = this.calculateNextMilestone(lessonsCompleted, child.companions.length);

      const dashboard: DashboardResponse = {
        lessonsCompleted,
        streak,
        avgScore: Math.round(avgScore * 100) / 100,
        practiceTime: Math.round(practiceTime),
        recentSessions,
        companionsUnlocked: child.companions.length,
        nextMilestone,
      };

      res.json(dashboard);

    } catch (error) {
      logger.error('Get child dashboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get all children for current user
   * GET /children
   */
  static async getChildren(req: Request, res: Response): Promise<void> {
    try {
      let children;

      if (req.user.role === Role.ADMIN) {
        // Admin can see all children
        children = await db.child.findMany({
          include: {
            guardians: {
              select: { id: true, email: true, displayName: true },
            },
            therapist: {
              select: { id: true, email: true, displayName: true },
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
      } else if (req.user.role === Role.THERAPIST) {
        // Therapist can see assigned children
        children = await db.child.findMany({
          where: { therapistId: req.user.uid },
          include: {
            guardians: {
              select: { id: true, email: true, displayName: true },
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
        // Parent can see their children
        children = await db.child.findMany({
          where: {
            guardians: { some: { id: req.user.uid } },
          },
          include: {
            therapist: {
              select: { id: true, email: true, displayName: true },
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
        dob: child.dob?.toISOString(),
        createdAt: child.createdAt.toISOString(),
        guardians: child.guardians,
        therapist: child.therapist,
        sessionsCompleted: child._count.sessions,
        companionsUnlocked: child._count.companions,
        consentMedia: child.consentMedia,
      }));

      res.json(response);

    } catch (error) {
      logger.error('Get children error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update child information
   * PUT /children/:id
   */
  static async updateChild(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.params.id;
      const { name, dob, therapistId, consentMedia } = req.body;

      // Verify therapist if provided
      if (therapistId) {
        const therapist = await db.user.findUnique({
          where: { id: therapistId, role: Role.THERAPIST },
        });

        if (!therapist) {
          res.status(400).json({ error: 'Invalid therapist ID' });
          return;
        }
      }

      const child = await db.child.update({
        where: { id: childId },
        data: {
          name: name || undefined,
          dob: dob ? new Date(dob) : undefined,
          therapistId: therapistId || undefined,
          consentMedia: consentMedia !== undefined ? consentMedia : undefined,
        },
        include: {
          guardians: {
            select: { id: true, email: true, displayName: true },
          },
          therapist: {
            select: { id: true, email: true, displayName: true },
          },
        },
      });

      logger.info(`Child updated: ${child.id} by user ${req.user.uid}`);

      res.json({
        id: child.id,
        name: child.name,
        level: child.level,
        dob: child.dob?.toISOString(),
        createdAt: child.createdAt.toISOString(),
        guardians: child.guardians,
        therapist: child.therapist,
        consentMedia: child.consentMedia,
      });

    } catch (error) {
      logger.error('Update child error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete child and all associated data
   * DELETE /children/:id/data
   */
  static async deleteChildData(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.params.id;

      // Only admin or parent can delete child data
      if (req.user.role !== Role.ADMIN) {
        const child = await db.child.findFirst({
          where: {
            id: childId,
            guardians: { some: { id: req.user.uid } },
          },
        });

        if (!child) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      // Get all media files to delete from storage
      const sessions = await db.session.findMany({
        where: { childId },
        select: { mediaRef: true },
      });

      // Delete child (cascade will handle related records)
      await db.child.delete({
        where: { id: childId },
      });

      // Delete media files from storage
      const StorageService = (await import('../services/storage')).StorageService;
      for (const session of sessions) {
        if (session.mediaRef) {
          try {
            await StorageService.deleteFile(session.mediaRef);
          } catch (error) {
            logger.warn(`Failed to delete media file: ${session.mediaRef}`, error);
          }
        }
      }

      logger.info(`Child data deleted: ${childId} by user ${req.user.uid}`);

      res.json({ 
        message: 'Child data deleted successfully',
        deletedChildId: childId 
      });

    } catch (error) {
      logger.error('Delete child data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Calculate consecutive day streak
   */
  private static calculateStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const dates = sessions
      .map(s => s.completedAt)
      .map(date => new Date(date).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
      .sort()
      .reverse();

    let streak = 0;
    const today = new Date().toDateString();
    let currentDate = new Date();

    for (let i = 0; i < dates.length; i++) {
      const sessionDate = new Date(dates[i]);
      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak || (streak === 0 && daysDiff <= 1)) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate next milestone
   */
  private static calculateNextMilestone(lessonsCompleted: number, companionsUnlocked: number): any {
    const milestones = [
      { sessions: 1, type: 'first_session' },
      { sessions: 5, type: 'regular_practice' },
      { sessions: 10, type: 'conversation_pro' },
      { sessions: 25, type: 'expert_communicator' },
      { sessions: 50, type: 'master_conversationalist' },
    ];

    for (const milestone of milestones) {
      if (lessonsCompleted < milestone.sessions) {
        return {
          type: milestone.type,
          progress: lessonsCompleted,
          target: milestone.sessions,
        };
      }
    }

    return undefined; // All milestones reached
  }
}