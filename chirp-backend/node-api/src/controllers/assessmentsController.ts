import { Request, Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { AssessmentStartResponse, AssessmentSubmitRequest, AssessmentSubmitResponse } from '../types';

export class AssessmentsController {
  /**
   * Start assessment for a child
   * POST /assessments/:childId/start
   */
  static async startAssessment(req: Request, res: Response): Promise<void> {
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
      });

      if (!child) {
        res.status(403).json({ error: 'Access denied to this child' });
        return;
      }

      // Check if assessment already exists
      const existingAssessment = await db.assessment.findUnique({
        where: { childId },
      });

      if (existingAssessment) {
        res.status(400).json({ 
          error: 'Assessment already completed for this child',
          assessment: {
            id: existingAssessment.id,
            level: existingAssessment.level,
            completedAt: existingAssessment.completedAt.toISOString(),
          }
        });
        return;
      }

      // Generate assessment questions based on child's age and current level
      const questions = this.generateAssessmentQuestions(child);

      const response: AssessmentStartResponse = {
        assessmentId: `temp-${child.id}-${Date.now()}`, // Temporary ID until submission
        questions,
      };

      logger.info(`Assessment started for child ${childId}`);

      res.json(response);

    } catch (error) {
      logger.error('Start assessment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Submit assessment results
   * POST /assessments/:id/submit
   */
  static async submitAssessment(req: Request, res: Response): Promise<void> {
    try {
      const assessmentId = req.params.id;
      const { rawResults }: AssessmentSubmitRequest = req.body;

      // Extract childId from temporary assessment ID
      const childId = assessmentId.startsWith('temp-') 
        ? assessmentId.split('-')[1]
        : assessmentId;

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

      // Calculate level based on raw results
      const { level, strengths, areasForGrowth, recommendedModules } = this.calculateAssessmentLevel(rawResults);

      // Create assessment record
      const assessment = await db.assessment.create({
        data: {
          childId,
          rawResults,
          level,
        },
      });

      // Update child's level
      await db.child.update({
        where: { id: childId },
        data: { level },
      });

      logger.info(`Assessment completed for child ${childId}, assigned level ${level}`);

      const response: AssessmentSubmitResponse = {
        level,
        strengths,
        areasForGrowth,
        recommendedModules,
      };

      res.json(response);

    } catch (error) {
      logger.error('Submit assessment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get assessment results
   * GET /assessments/:childId
   */
  static async getAssessment(req: Request, res: Response): Promise<void> {
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
          assessment: true,
        },
      });

      if (!child) {
        res.status(403).json({ error: 'Access denied to this child' });
        return;
      }

      if (!child.assessment) {
        res.status(404).json({ error: 'No assessment found for this child' });
        return;
      }

      // Re-calculate insights for display
      const { strengths, areasForGrowth, recommendedModules } = this.calculateAssessmentLevel(child.assessment.rawResults);

      res.json({
        id: child.assessment.id,
        childId: child.id,
        level: child.assessment.level,
        completedAt: child.assessment.completedAt.toISOString(),
        strengths,
        areasForGrowth,
        recommendedModules,
        // Don't expose raw results to parents, only to therapists/admins
        rawResults: req.user.role === 'THERAPIST' || req.user.role === 'ADMIN' 
          ? child.assessment.rawResults 
          : undefined,
      });

    } catch (error) {
      logger.error('Get assessment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Generate assessment questions based on child profile
   */
  private static generateAssessmentQuestions(child: any): any[] {
    const baseQuestions = [
      {
        id: 'social_comfort',
        type: 'multiple_choice',
        question: 'How comfortable does your child feel when meeting new people?',
        options: [
          'Very comfortable - enjoys meeting new people',
          'Somewhat comfortable - may be shy at first',
          'Uncomfortable - prefers familiar people',
          'Very uncomfortable - avoids new social situations'
        ]
      },
      {
        id: 'eye_contact',
        type: 'multiple_choice',
        question: 'How often does your child make eye contact during conversations?',
        options: [
          'Regularly maintains appropriate eye contact',
          'Sometimes makes eye contact',
          'Rarely makes eye contact',
          'Avoids eye contact'
        ]
      },
      {
        id: 'conversation_initiation',
        type: 'multiple_choice',
        question: 'How often does your child start conversations with others?',
        options: [
          'Often starts conversations',
          'Sometimes starts conversations with familiar people',
          'Rarely starts conversations',
          'Never starts conversations'
        ]
      },
      {
        id: 'turn_taking',
        type: 'multiple_choice',
        question: 'How well does your child take turns in conversations?',
        options: [
          'Excellent - waits for others to finish and responds appropriately',
          'Good - usually waits their turn',
          'Fair - sometimes interrupts or has difficulty waiting',
          'Needs support - often interrupts or doesn\'t respond'
        ]
      },
      {
        id: 'nonverbal_understanding',
        type: 'multiple_choice',
        question: 'How well does your child understand facial expressions and body language?',
        options: [
          'Very well - picks up on most nonverbal cues',
          'Pretty well - understands obvious expressions',
          'Somewhat - misses some nonverbal cues',
          'Difficulty - often misses nonverbal communication'
        ]
      },
      {
        id: 'topic_flexibility',
        type: 'multiple_choice',
        question: 'How flexible is your child with conversation topics?',
        options: [
          'Very flexible - easily follows topic changes',
          'Somewhat flexible - can adapt with gentle guidance',
          'Limited flexibility - prefers familiar topics',
          'Inflexible - strongly prefers specific topics'
        ]
      },
      {
        id: 'emotional_expression',
        type: 'multiple_choice',
        question: 'How well does your child express their emotions verbally?',
        options: [
          'Very well - clearly communicates feelings',
          'Pretty well - usually can express basic emotions',
          'Somewhat - has difficulty with complex emotions',
          'Difficulty - struggles to express emotions verbally'
        ]
      },
      {
        id: 'scenario_response',
        type: 'scenario',
        question: 'Your child is at a playground and sees another child playing alone. What would they most likely do?',
        options: [
          'Approach and ask to play together',
          'Watch for a while, then maybe approach',
          'Want to play but wait for an adult to help',
          'Continue playing by themselves'
        ]
      }
    ];

    // Add age-appropriate questions
    const childAge = child.dob ? this.calculateAge(child.dob) : 8;
    
    if (childAge >= 10) {
      baseQuestions.push({
        id: 'conflict_resolution',
        type: 'multiple_choice',
        question: 'When there\'s a disagreement with friends, your child:',
        options: [
          'Tries to talk it out and find a solution',
          'Gets upset but can be helped to resolve it',
          'Avoids the situation or gets very upset',
          'Has difficulty understanding the disagreement'
        ]
      });
    }

    return baseQuestions;
  }

  /**
   * Calculate assessment level and insights
   */
  private static calculateAssessmentLevel(rawResults: any): {
    level: number;
    strengths: string[];
    areasForGrowth: string[];
    recommendedModules: string[];
  } {
    const responses = rawResults.responses || [];
    let totalScore = 0;
    const maxScore = responses.length * 3; // Assuming 0-3 scoring
    
    const strengths: string[] = [];
    const areasForGrowth: string[] = [];
    const recommendedModules: string[] = [];

    // Score each response (reverse scoring - option 0 = best, option 3 = needs most support)
    responses.forEach((response: any) => {
      const score = 3 - response.selectedOption; // Reverse score
      totalScore += score;

      // Identify strengths and growth areas
      switch (response.questionId) {
        case 'social_comfort':
          if (score >= 2) strengths.push('Social comfort');
          else {
            areasForGrowth.push('Social comfort in new situations');
            recommendedModules.push('meeting_new_friends');
          }
          break;
        case 'eye_contact':
          if (score >= 2) strengths.push('Eye contact');
          else {
            areasForGrowth.push('Eye contact during conversations');
            recommendedModules.push('eye_contact_practice');
          }
          break;
        case 'conversation_initiation':
          if (score >= 2) strengths.push('Starting conversations');
          else {
            areasForGrowth.push('Initiating conversations');
            recommendedModules.push('conversation_starters');
          }
          break;
        case 'turn_taking':
          if (score >= 2) strengths.push('Turn-taking in conversations');
          else {
            areasForGrowth.push('Taking turns in conversations');
            recommendedModules.push('conversation_flow');
          }
          break;
        case 'nonverbal_understanding':
          if (score >= 2) strengths.push('Understanding body language');
          else {
            areasForGrowth.push('Reading nonverbal cues');
            recommendedModules.push('reading_emotions');
          }
          break;
        case 'topic_flexibility':
          if (score >= 2) strengths.push('Flexible conversation topics');
          else {
            areasForGrowth.push('Adapting to different topics');
            recommendedModules.push('topic_transitions');
          }
          break;
        case 'emotional_expression':
          if (score >= 2) strengths.push('Expressing emotions');
          else {
            areasForGrowth.push('Verbal emotional expression');
            recommendedModules.push('feelings_vocabulary');
          }
          break;
      }
    });

    // Calculate level (1-5)
    const percentage = totalScore / maxScore;
    let level: number;
    
    if (percentage >= 0.8) level = 5;
    else if (percentage >= 0.6) level = 4;
    else if (percentage >= 0.4) level = 3;
    else if (percentage >= 0.2) level = 2;
    else level = 1;

    // Ensure at least one strength
    if (strengths.length === 0) {
      strengths.push('Willingness to practice and learn');
    }

    // Remove duplicate modules
    const uniqueModules = [...new Set(recommendedModules)];

    return {
      level,
      strengths,
      areasForGrowth,
      recommendedModules: uniqueModules,
    };
  }

  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  }
}