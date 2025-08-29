import { Request, Response } from 'express';
import axios from 'axios';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { CreateScenarioRequest, ScenarioResponse, GenerateScenarioRequest, GenerateScenarioResponse } from '../types';
import { Role } from '@prisma/client';

export class ScenariosController {
  /**
   * Create a new scenario
   * POST /scenarios
   */
  static async createScenario(req: Request, res: Response): Promise<void> {
    try {
      const { title, tags, difficulty, description }: CreateScenarioRequest = req.body;

      // Only therapists and admins can create scenarios
      if (req.user.role !== Role.THERAPIST && req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Insufficient permissions to create scenarios' });
        return;
      }

      // Generate script and rubric using Python service
      const generatedContent = await this.generateScenarioContent(description, difficulty, tags);

      // Create scenario
      const scenario = await db.scenario.create({
        data: {
          title,
          tags,
          difficulty,
          scriptJson: generatedContent.scriptJson,
          rubricJson: generatedContent.rubricJson,
          createdById: req.user.uid,
        },
      });

      logger.info(`Scenario created: ${scenario.id} by user ${req.user.uid}`);

      const response: ScenarioResponse = {
        id: scenario.id,
        title: scenario.title,
        tags: scenario.tags,
        difficulty: scenario.difficulty,
        scriptJson: scenario.scriptJson,
        rubricJson: scenario.rubricJson,
        createdAt: scenario.createdAt.toISOString(),
      };

      res.status(201).json(response);

    } catch (error) {
      logger.error('Create scenario error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get scenario by ID
   * GET /scenarios/:id
   */
  static async getScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = req.params.id;

      const scenario = await db.scenario.findUnique({
        where: { id: scenarioId },
        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      if (!scenario) {
        res.status(404).json({ error: 'Scenario not found' });
        return;
      }

      const response: ScenarioResponse = {
        id: scenario.id,
        title: scenario.title,
        tags: scenario.tags,
        difficulty: scenario.difficulty,
        scriptJson: scenario.scriptJson,
        rubricJson: scenario.rubricJson,
        createdAt: scenario.createdAt.toISOString(),
      };

      res.json(response);

    } catch (error) {
      logger.error('Get scenario error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get scenarios list with filtering
   * GET /scenarios
   */
  static async getScenarios(req: Request, res: Response): Promise<void> {
    try {
      const difficulty = req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined;
      const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const where: any = {};
      
      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (tags && tags.length > 0) {
        where.tags = {
          hasSome: tags,
        };
      }

      const scenarios = await db.scenario.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
          _count: {
            select: {
              sessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const response = scenarios.map(scenario => ({
        id: scenario.id,
        title: scenario.title,
        tags: scenario.tags,
        difficulty: scenario.difficulty,
        createdAt: scenario.createdAt.toISOString(),
        createdBy: scenario.createdBy,
        usageCount: scenario._count.sessions,
        // Don't include full script/rubric in list view for performance
      }));

      res.json(response);

    } catch (error) {
      logger.error('Get scenarios error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Generate scenario preview (therapist only)
   * POST /therapist/scenario/generate
   */
  static async generateScenarioPreview(req: Request, res: Response): Promise<void> {
    try {
      const { text, difficulty, tags }: GenerateScenarioRequest = req.body;

      // Only therapists and admins can generate scenarios
      if (req.user.role !== Role.THERAPIST && req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const generatedContent = await this.generateScenarioContent(text, difficulty || 1, tags || []);

      const response: GenerateScenarioResponse = {
        scriptJson: generatedContent.scriptJson,
        rubricJson: generatedContent.rubricJson,
        preview: this.generatePreviewText(generatedContent.scriptJson),
      };

      res.json(response);

    } catch (error) {
      logger.error('Generate scenario preview error:', error);
      res.status(500).json({ error: 'Failed to generate scenario' });
    }
  }

  /**
   * Update scenario
   * PUT /scenarios/:id
   */
  static async updateScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = req.params.id;
      const { title, tags, difficulty, scriptJson, rubricJson } = req.body;

      // Check if user can edit this scenario
      const scenario = await db.scenario.findUnique({
        where: { id: scenarioId },
      });

      if (!scenario) {
        res.status(404).json({ error: 'Scenario not found' });
        return;
      }

      // Only creator, therapists, and admins can edit
      if (req.user.role !== Role.ADMIN && 
          req.user.role !== Role.THERAPIST && 
          scenario.createdById !== req.user.uid) {
        res.status(403).json({ error: 'Insufficient permissions to edit this scenario' });
        return;
      }

      const updatedScenario = await db.scenario.update({
        where: { id: scenarioId },
        data: {
          title: title || undefined,
          tags: tags || undefined,
          difficulty: difficulty || undefined,
          scriptJson: scriptJson || undefined,
          rubricJson: rubricJson || undefined,
        },
      });

      logger.info(`Scenario updated: ${scenarioId} by user ${req.user.uid}`);

      const response: ScenarioResponse = {
        id: updatedScenario.id,
        title: updatedScenario.title,
        tags: updatedScenario.tags,
        difficulty: updatedScenario.difficulty,
        scriptJson: updatedScenario.scriptJson,
        rubricJson: updatedScenario.rubricJson,
        createdAt: updatedScenario.createdAt.toISOString(),
      };

      res.json(response);

    } catch (error) {
      logger.error('Update scenario error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete scenario
   * DELETE /scenarios/:id
   */
  static async deleteScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = req.params.id;

      // Check if user can delete this scenario
      const scenario = await db.scenario.findUnique({
        where: { id: scenarioId },
        include: {
          _count: {
            select: { sessions: true },
          },
        },
      });

      if (!scenario) {
        res.status(404).json({ error: 'Scenario not found' });
        return;
      }

      // Only creator and admins can delete
      if (req.user.role !== Role.ADMIN && scenario.createdById !== req.user.uid) {
        res.status(403).json({ error: 'Insufficient permissions to delete this scenario' });
        return;
      }

      // Prevent deletion if scenario has been used
      if (scenario._count.sessions > 0) {
        res.status(400).json({ 
          error: 'Cannot delete scenario that has been used in sessions',
          usageCount: scenario._count.sessions,
        });
        return;
      }

      await db.scenario.delete({
        where: { id: scenarioId },
      });

      logger.info(`Scenario deleted: ${scenarioId} by user ${req.user.uid}`);

      res.json({ 
        message: 'Scenario deleted successfully',
        deletedScenarioId: scenarioId,
      });

    } catch (error) {
      logger.error('Delete scenario error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Generate scenario content using Python service
   */
  private static async generateScenarioContent(
    description: string, 
    difficulty: number, 
    tags: string[]
  ): Promise<{ scriptJson: any; rubricJson: any }> {
    try {
      const pyApiUrl = process.env.PY_API_URL || 'http://localhost:8000';
      
      const response = await axios.post(
        `${pyApiUrl}/generate`,
        {
          text: description,
          difficulty,
          tags,
        },
        { timeout: 30000 } // 30 second timeout
      );

      return {
        scriptJson: response.data.script_json,
        rubricJson: response.data.rubric_json,
      };
    } catch (error) {
      logger.error('Python service generation error:', error);
      
      // Fallback to template-based generation
      return this.generateFallbackScenario(description, difficulty, tags);
    }
  }

  /**
   * Generate fallback scenario when Python service is unavailable
   */
  private static generateFallbackScenario(
    description: string, 
    difficulty: number, 
    tags: string[]
  ): { scriptJson: any; rubricJson: any } {
    const scriptJson = {
      title: "Practice Conversation",
      description,
      difficulty,
      tags,
      steps: [
        {
          id: "greeting",
          type: "avatar_speak",
          content: "Hi there! I'm excited to practice with you today.",
          expectedResponse: "greeting_response",
          hints: ["Try saying hello back!", "You can wave or say hi!"],
        },
        {
          id: "main_topic",
          type: "avatar_ask",
          content: "What would you like to talk about?",
          expectedResponse: "topic_response",
          hints: ["Think about something you enjoy!", "Maybe a hobby or favorite activity?"],
        },
        {
          id: "follow_up",
          type: "avatar_respond",
          content: "That sounds really interesting! Can you tell me more?",
          expectedResponse: "elaboration",
          hints: ["Try to add more details!", "What do you like most about it?"],
        },
        {
          id: "conclusion",
          type: "avatar_speak",
          content: "Thank you for sharing that with me! You did a great job in our conversation.",
          expectedResponse: null,
          hints: [],
        },
      ],
    };

    const rubricJson = {
      levels: {
        1: {
          eyeContact: { weight: 0.3, threshold: 0.3 },
          speechClarity: { weight: 0.3, threshold: 0.4 },
          engagement: { weight: 0.2, threshold: 0.3 },
          turnTaking: { weight: 0.2, threshold: 0.3 },
        },
        2: {
          eyeContact: { weight: 0.3, threshold: 0.4 },
          speechClarity: { weight: 0.3, threshold: 0.5 },
          engagement: { weight: 0.2, threshold: 0.4 },
          turnTaking: { weight: 0.2, threshold: 0.4 },
        },
        3: {
          eyeContact: { weight: 0.25, threshold: 0.5 },
          speechClarity: { weight: 0.25, threshold: 0.6 },
          engagement: { weight: 0.25, threshold: 0.5 },
          turnTaking: { weight: 0.25, threshold: 0.5 },
        },
      },
      feedback: {
        positive: [
          "Great job maintaining eye contact!",
          "Your speech was very clear!",
          "I can see you're really engaged in our conversation!",
          "Excellent turn-taking!",
        ],
        improvement: [
          "Try to look at me a bit more during our conversation",
          "Take your time and speak clearly",
          "Show me you're interested by asking questions too",
          "Remember to wait for me to finish before responding",
        ],
      },
    };

    return { scriptJson, rubricJson };
  }

  /**
   * Generate preview text from script
   */
  private static generatePreviewText(scriptJson: any): string {
    if (!scriptJson || !scriptJson.steps) {
      return "Generated scenario with interactive conversation practice.";
    }

    const steps = scriptJson.steps.slice(0, 3); // First 3 steps for preview
    const preview = steps
      .filter((step: any) => step.type === 'avatar_speak' || step.type === 'avatar_ask')
      .map((step: any) => `Avatar: "${step.content}"`)
      .join('\n');

    return preview || "Interactive conversation practice scenario.";
  }
}