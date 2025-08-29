import { Request, Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { ChildSummaryReport, ClinicalReport } from '../types';
import { Role } from '@prisma/client';

export class AnalysisController {
  /**
   * Get parent-friendly analysis summary
   * GET /analysis/:childId/summary
   */
  static async getChildSummary(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.params.childId;

      // Verify child access
      const child = await db.child.findFirst({
        where: {
          id: childId,
          OR: [
            { guardians: { some: { id: req.user.uid } } },
            { therapistId: req.user.uid },
          ],
        },
        include: {
          sessions: {
            where: { completedAt: { not: null } },
            include: {
              scenario: { select: { title: true } },
            },
            orderBy: { completedAt: 'desc' },
          },
          companions: true,
        },
      });

      if (!child) {
        res.status(403).json({ error: 'Access denied to this child' });
        return;
      }

      // Calculate summary metrics
      const completedSessions = child.sessions;
      const totalSessions = completedSessions.length;

      if (totalSessions === 0) {
        res.json({
          childId: child.id,
          name: child.name,
          totalSessions: 0,
          avgScore: 0,
          practiceMinutes: 0,
          strengthAreas: [],
          improvementAreas: [],
          recentProgress: [],
          companionsEarned: child.companions.length,
          currentStreak: 0,
          lastActive: null,
        });
        return;
      }

      // Calculate average score
      const scores = completedSessions
        .map(session => (session.resultJson as any)?.overall_score || 0)
        .filter(score => score > 0);
      
      const avgScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

      // Calculate practice time
      const practiceMinutes = completedSessions.reduce((total, session) => {
        if (session.completedAt && session.startedAt) {
          const duration = (session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60);
          return total + Math.min(duration, 30); // Cap at 30 minutes per session
        }
        return total + 10; // Default 10 minutes
      }, 0);

      // Analyze strength areas and improvement areas
      const { strengthAreas, improvementAreas } = this.analyzePerformanceAreas(completedSessions);

      // Get recent progress (last 10 sessions)
      const recentProgress = completedSessions
        .slice(0, 10)
        .map(session => ({
          date: session.completedAt!.toISOString().split('T')[0],
          score: (session.resultJson as any)?.overall_score || 0,
          activity: session.scenario?.title || 'Practice Session',
        }))
        .reverse(); // Chronological order

      // Calculate streak
      const currentStreak = this.calculateStreak(completedSessions);

      const summary: ChildSummaryReport = {
        childId: child.id,
        name: child.name,
        totalSessions,
        avgScore: Math.round(avgScore * 100) / 100,
        practiceMinutes: Math.round(practiceMinutes),
        strengthAreas,
        improvementAreas,
        recentProgress,
        companionsEarned: child.companions.length,
        currentStreak,
        lastActive: completedSessions[0]?.completedAt?.toISOString() || null,
      };

      res.json(summary);

    } catch (error) {
      logger.error('Get child summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get detailed clinical report (therapist only)
   * GET /analysis/:childId/clinical
   */
  static async getClinicalReport(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.params.childId;

      // Only therapists and admins can access clinical reports
      if (req.user.role !== Role.THERAPIST && req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Insufficient permissions for clinical report' });
        return;
      }

      // Verify child access for therapists
      if (req.user.role === Role.THERAPIST) {
        const child = await db.child.findFirst({
          where: {
            id: childId,
            therapistId: req.user.uid,
          },
        });

        if (!child) {
          res.status(403).json({ error: 'Access denied to this child' });
          return;
        }
      }

      // Get detailed child data
      const child = await db.child.findUnique({
        where: { id: childId },
        include: {
          sessions: {
            where: { completedAt: { not: null } },
            include: {
              scenario: { select: { title: true } },
              analysisJobs: {
                where: { status: 'DONE' },
                select: { resultJson: true },
              },
            },
            orderBy: { completedAt: 'desc' },
          },
          companions: true,
          assessment: true,
        },
      });

      if (!child) {
        res.status(404).json({ error: 'Child not found' });
        return;
      }

      // Generate clinical report
      const report = await this.generateClinicalReport(child);
      res.json(report);

    } catch (error) {
      logger.error('Get clinical report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get analysis trends over time
   * GET /analysis/:childId/trends
   */
  static async getAnalysisTrends(req: Request, res: Response): Promise<void> {
    try {
      const childId = req.params.childId;
      const days = parseInt(req.query.days as string) || 30;

      // Verify child access
      const child = await db.child.findFirst({
        where: {
          id: childId,
          OR: [
            { guardians: { some: { id: req.user.uid } } },
            { therapistId: req.user.uid },
          ],
        },
      });

      if (!child) {
        res.status(403).json({ error: 'Access denied to this child' });
        return;
      }

      // Get sessions within date range
      const sessions = await db.session.findMany({
        where: {
          childId,
          completedAt: {
            not: null,
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { completedAt: 'asc' },
      });

      // Extract trend data
      const trends = sessions.map(session => {
        const analysis = session.resultJson as any;
        return {
          date: session.completedAt!.toISOString().split('T')[0],
          overallScore: analysis?.overall_score || 0,
          eyeContactScore: analysis?.eye_contact_score || 0,
          speechClarity: analysis?.speech_clarity || 0,
          prosodyScore: analysis?.prosody_score || 0,
          engagementLevel: analysis?.engagement_level || 0,
        };
      });

      // Group by date and average scores for multiple sessions per day
      const dailyTrends = trends.reduce((acc: any, curr) => {
        if (!acc[curr.date]) {
          acc[curr.date] = {
            date: curr.date,
            sessions: [],
            overallScore: 0,
            eyeContactScore: 0,
            speechClarity: 0,
            prosodyScore: 0,
            engagementLevel: 0,
          };
        }
        
        acc[curr.date].sessions.push(curr);
        return acc;
      }, {});

      // Calculate averages
      Object.values(dailyTrends).forEach((day: any) => {
        const sessionCount = day.sessions.length;
        day.overallScore = day.sessions.reduce((sum: number, s: any) => sum + s.overallScore, 0) / sessionCount;
        day.eyeContactScore = day.sessions.reduce((sum: number, s: any) => sum + s.eyeContactScore, 0) / sessionCount;
        day.speechClarity = day.sessions.reduce((sum: number, s: any) => sum + s.speechClarity, 0) / sessionCount;
        day.prosodyScore = day.sessions.reduce((sum: number, s: any) => sum + s.prosodyScore, 0) / sessionCount;
        day.engagementLevel = day.sessions.reduce((sum: number, s: any) => sum + s.engagementLevel, 0) / sessionCount;
        
        // Remove sessions array from response
        delete day.sessions;
      });

      const sortedTrends = Object.values(dailyTrends).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      res.json({
        childId,
        dateRange: {
          start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
        trends: sortedTrends,
        totalSessions: sessions.length,
      });

    } catch (error) {
      logger.error('Get analysis trends error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Analyze performance areas from sessions
   */
  private static analyzePerformanceAreas(sessions: any[]): {
    strengthAreas: string[];
    improvementAreas: string[];
  } {
    if (sessions.length === 0) {
      return { strengthAreas: [], improvementAreas: [] };
    }

    const metrics = {
      eyeContact: [],
      speechClarity: [],
      prosody: [],
      engagement: [],
    };

    // Collect metrics from sessions
    sessions.forEach(session => {
      const analysis = session.resultJson as any;
      if (analysis) {
        metrics.eyeContact.push(analysis.eye_contact_score || 0);
        metrics.speechClarity.push(analysis.speech_clarity || 0);
        metrics.prosody.push(analysis.prosody_score || 0);
        metrics.engagement.push(analysis.engagement_level || 0);
      }
    });

    // Calculate averages
    const averages = {
      eyeContact: this.average(metrics.eyeContact),
      speechClarity: this.average(metrics.speechClarity),
      prosody: this.average(metrics.prosody),
      engagement: this.average(metrics.engagement),
    };

    const strengthAreas: string[] = [];
    const improvementAreas: string[] = [];

    // Determine strengths and areas for improvement
    Object.entries(averages).forEach(([metric, avg]) => {
      const metricName = this.getMetricDisplayName(metric);
      
      if (avg >= 0.7) {
        strengthAreas.push(metricName);
      } else if (avg < 0.5) {
        improvementAreas.push(metricName);
      }
    });

    // Ensure we have at least one strength
    if (strengthAreas.length === 0 && sessions.length > 0) {
      strengthAreas.push('Consistent practice and participation');
    }

    return { strengthAreas, improvementAreas };
  }

  /**
   * Generate detailed clinical report
   */
  private static async generateClinicalReport(child: any): Promise<ClinicalReport> {
    const sessions = child.sessions;
    const totalSessions = sessions.length;

    // Calculate basic metrics
    const avgScore = sessions.length > 0
      ? sessions.reduce((sum: number, s: any) => sum + ((s.resultJson as any)?.overall_score || 0), 0) / sessions.length
      : 0;

    const practiceMinutes = sessions.reduce((total: number, session: any) => {
      if (session.completedAt && session.startedAt) {
        const duration = (session.completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60);
        return total + Math.min(duration, 30);
      }
      return total + 10;
    }, 0);

    // Extract detailed metrics for trends
    const detailedMetrics = {
      eyeContactTrend: sessions.map((s: any) => (s.resultJson as any)?.eye_contact_score || 0),
      speechClarityTrend: sessions.map((s: any) => (s.resultJson as any)?.speech_clarity || 0),
      prosodyTrend: sessions.map((s: any) => (s.resultJson as any)?.prosody_score || 0),
      engagementTrend: sessions.map((s: any) => (s.resultJson as any)?.engagement_level || 0),
    };

    // Generate session breakdown
    const sessionBreakdown = sessions.slice(0, 20).map((session: any) => ({
      sessionId: session.id,
      date: session.completedAt.toISOString().split('T')[0],
      scenario: session.scenario?.title || 'Practice Session',
      rawScores: session.resultJson,
      clinicalNotes: this.generateClinicalNotes(session.resultJson),
    }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(child, detailedMetrics);

    // Calculate goal progress (based on assessment if available)
    const goalProgress = this.calculateGoalProgress(child, detailedMetrics);

    const { strengthAreas, improvementAreas } = this.analyzePerformanceAreas(sessions);

    const report: ClinicalReport = {
      childId: child.id,
      name: child.name,
      totalSessions,
      avgScore: Math.round(avgScore * 100) / 100,
      practiceMinutes: Math.round(practiceMinutes),
      strengthAreas,
      improvementAreas,
      recentProgress: sessions.slice(0, 10).map((s: any) => ({
        date: s.completedAt.toISOString().split('T')[0],
        score: (s.resultJson as any)?.overall_score || 0,
        activity: s.scenario?.title || 'Practice Session',
      })).reverse(),
      companionsEarned: child.companions.length,
      currentStreak: this.calculateStreak(sessions),
      lastActive: sessions[0]?.completedAt?.toISOString() || null,
      detailedMetrics,
      sessionBreakdown,
      recommendations,
      goalProgress,
    };

    return report;
  }

  /**
   * Generate clinical notes for a session
   */
  private static generateClinicalNotes(resultJson: any): string[] {
    if (!resultJson) return [];

    const notes: string[] = [];
    const analysis = resultJson as any;

    // Eye contact analysis
    if (analysis.eye_contact_score !== undefined) {
      if (analysis.eye_contact_score >= 0.8) {
        notes.push('Excellent eye contact maintenance throughout session');
      } else if (analysis.eye_contact_score >= 0.6) {
        notes.push('Good eye contact with some breaks');
      } else if (analysis.eye_contact_score >= 0.4) {
        notes.push('Moderate eye contact - room for improvement');
      } else {
        notes.push('Limited eye contact observed - intervention recommended');
      }
    }

    // Speech clarity analysis
    if (analysis.speech_clarity !== undefined) {
      if (analysis.speech_clarity >= 0.8) {
        notes.push('Clear, articulate speech patterns');
      } else if (analysis.speech_clarity >= 0.6) {
        notes.push('Generally clear speech with minor unclear moments');
      } else {
        notes.push('Speech clarity challenges noted - speech therapy consideration');
      }
    }

    // Engagement analysis
    if (analysis.engagement_level !== undefined) {
      if (analysis.engagement_level >= 0.7) {
        notes.push('High engagement and active participation');
      } else if (analysis.engagement_level >= 0.5) {
        notes.push('Moderate engagement with prompting');
      } else {
        notes.push('Low engagement levels - motivation strategies needed');
      }
    }

    return notes;
  }

  /**
   * Generate clinical recommendations
   */
  private static generateRecommendations(child: any, metrics: any): string[] {
    const recommendations: string[] = [];

    // Analyze trends
    const eyeContactTrend = this.calculateTrend(metrics.eyeContactTrend);
    const speechTrend = this.calculateTrend(metrics.speechClarityTrend);
    const engagementTrend = this.calculateTrend(metrics.engagementTrend);

    // Eye contact recommendations
    if (this.average(metrics.eyeContactTrend) < 0.5) {
      recommendations.push('Consider eye contact specific interventions and practice exercises');
    } else if (eyeContactTrend < 0) {
      recommendations.push('Monitor eye contact regression - may need refresher training');
    }

    // Speech recommendations
    if (this.average(metrics.speechClarityTrend) < 0.5) {
      recommendations.push('Refer to speech-language pathologist for articulation assessment');
    }

    // Engagement recommendations
    if (this.average(metrics.engagementTrend) < 0.5) {
      recommendations.push('Explore motivational strategies and preferred topics to increase engagement');
    }

    // Session frequency recommendations
    if (child.sessions.length > 0) {
      const recentSessions = child.sessions.slice(0, 7); // Last 7 sessions
      const daysSinceLastSession = recentSessions.length > 0 
        ? (Date.now() - new Date(recentSessions[0].completedAt).getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      if (daysSinceLastSession > 7) {
        recommendations.push('Increase session frequency - regular practice is key for skill development');
      }
    }

    // General recommendations
    recommendations.push('Continue consistent practice to maintain and build upon current skills');

    return recommendations;
  }

  /**
   * Calculate goal progress
   */
  private static calculateGoalProgress(child: any, metrics: any): any[] {
    const goals = [];

    // Define standard goals based on assessment level
    const level = child.level || 1;

    if (level <= 3) {
      goals.push({
        goal: 'Maintain eye contact for 50% of conversation',
        progress: Math.round(this.average(metrics.eyeContactTrend) * 100),
        target: 50,
      });

      goals.push({
        goal: 'Speak clearly in 70% of responses',
        progress: Math.round(this.average(metrics.speechClarityTrend) * 100),
        target: 70,
      });

      goals.push({
        goal: 'Show engagement in conversations',
        progress: Math.round(this.average(metrics.engagementTrend) * 100),
        target: 60,
      });
    } else {
      goals.push({
        goal: 'Maintain consistent eye contact (70%+)',
        progress: Math.round(this.average(metrics.eyeContactTrend) * 100),
        target: 70,
      });

      goals.push({
        goal: 'Clear speech in most interactions (80%+)',
        progress: Math.round(this.average(metrics.speechClarityTrend) * 100),
        target: 80,
      });

      goals.push({
        goal: 'High engagement in conversations (75%+)',
        progress: Math.round(this.average(metrics.engagementTrend) * 100),
        target: 75,
      });
    }

    return goals;
  }

  /**
   * Helper methods
   */
  private static average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  private static calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    return this.average(secondHalf) - this.average(firstHalf);
  }

  private static calculateStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const dates = sessions
      .map(s => s.completedAt)
      .map(date => new Date(date).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort()
      .reverse();

    let streak = 0;
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

  private static getMetricDisplayName(metric: string): string {
    const names: Record<string, string> = {
      eyeContact: 'Eye contact',
      speechClarity: 'Speech clarity',
      prosody: 'Speech rhythm and tone',
      engagement: 'Conversation engagement',
    };
    return names[metric] || metric;
  }
}