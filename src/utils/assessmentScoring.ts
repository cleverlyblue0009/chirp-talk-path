import { 
  AssessmentResults, 
  QuestionResponse, 
  AssessmentQuestion,
  CategoryScore,
  AssessmentMetrics,
  ASSESSMENT_QUESTIONS
} from '@/types/assessment';

// Scoring weights as specified
const CATEGORY_WEIGHTS = {
  verbal: 0.35,
  nonverbal: 0.30,
  social: 0.25,
  comfort: 0.10
};

// Minimum scores for level thresholds
const LEVEL_THRESHOLDS = {
  beginner: { min: 0, max: 40 },
  intermediate: { min: 41, max: 70 },
  advanced: { min: 71, max: 100 }
};

export class AssessmentScorer {
  
  static calculateResults(
    userId: string, 
    responses: QuestionResponse[]
  ): AssessmentResults {
    
    const categoryScores = this.calculateCategoryScores(responses);
    const detailedMetrics = this.calculateDetailedMetrics(responses);
    const overallScore = this.calculateOverallScore(categoryScores);
    const recommendedLevel = this.determineLevel(overallScore);
    const suggestedModules = this.generateModuleRecommendations(categoryScores, recommendedLevel);
    const personalizedContent = this.generatePersonalizedContent(responses, categoryScores);

    return {
      userId,
      timestamp: new Date().toISOString(),
      overallScore,
      categoryScores,
      detailedMetrics,
      recommendedLevel,
      suggestedModules,
      personalizedContent,
      confidence: this.calculateAssessmentConfidence(responses)
    };
  }

  private static calculateCategoryScores(responses: QuestionResponse[]) {
    const categories = ['verbal', 'nonverbal', 'social', 'comfort'] as const;
    const categoryScores: any = {};

    categories.forEach(category => {
      const categoryResponses = responses.filter(response => {
        const question = ASSESSMENT_QUESTIONS.find(q => q.id === response.questionId);
        return question?.category === category;
      });

      categoryScores[category === 'verbal' ? 'verbalCommunication' : 
                     category === 'nonverbal' ? 'nonVerbalCommunication' :
                     category === 'social' ? 'socialInteraction' : 'comfortLevel'] = 
        this.scoreCategoryResponses(categoryResponses, category);
    });

    return categoryScores;
  }

  private static scoreCategoryResponses(responses: QuestionResponse[], category: string): CategoryScore {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const strengths: string[] = [];
    const improvementAreas: string[] = [];
    const specificMetrics: any = {};

    responses.forEach(response => {
      const question = ASSESSMENT_QUESTIONS.find(q => q.id === response.questionId);
      if (!question) return;

      const scoreResult = this.scoreIndividualResponse(response, question);
      totalScore += scoreResult.score;
      maxPossibleScore += scoreResult.maxScore;

      // Add to strengths or improvement areas based on performance
      if (scoreResult.score >= scoreResult.maxScore * 0.8) {
        strengths.push(...scoreResult.strengths);
      } else if (scoreResult.score < scoreResult.maxScore * 0.5) {
        improvementAreas.push(...scoreResult.improvements);
      }

      // Collect specific metrics
      Object.assign(specificMetrics, scoreResult.metrics);
    });

    const categoryScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      score: Math.round(categoryScore),
      strengths: [...new Set(strengths)], // Remove duplicates
      improvementAreas: [...new Set(improvementAreas)],
      specificMetrics
    };
  }

  private static scoreIndividualResponse(response: QuestionResponse, question: AssessmentQuestion) {
    const result = {
      score: 0,
      maxScore: 100,
      strengths: [] as string[],
      improvements: [] as string[],
      metrics: {} as any
    };

    switch (question.type) {
      case 'mcq':
        result.score = this.scoreMCQResponse(response, question);
        break;
      
      case 'speech':
        result.score = this.scoreSpeechResponse(response, question);
        if (response.analysisData?.speechAnalysis) {
          Object.assign(result.metrics, {
            speechClarity: response.analysisData.speechAnalysis.clarity,
            responseTime: response.responseTime
          });
        }
        break;
      
      case 'facial':
        result.score = this.scoreFacialResponse(response, question);
        if (response.analysisData?.facialAnalysis) {
          Object.assign(result.metrics, {
            eyeContactDuration: response.analysisData.facialAnalysis.eyeContact.duration,
            emotionRecognition: response.analysisData.facialAnalysis.overallEngagement
          });
        }
        break;
      
      case 'gesture':
        result.score = this.scoreGestureResponse(response, question);
        if (response.analysisData?.gestureAnalysis) {
          Object.assign(result.metrics, {
            gestureAccuracy: response.analysisData.gestureAnalysis.appropriateness
          });
        }
        break;
      
      case 'scenario':
        result.score = this.scoreMCQResponse(response, question); // Similar to MCQ
        break;
    }

    // Determine strengths and improvements based on score
    this.addStrengthsAndImprovements(result, question, response);

    return result;
  }

  private static scoreMCQResponse(response: QuestionResponse, question: AssessmentQuestion): number {
    if (question.correctAnswer === -1) {
      // No correct answer (comfort level questions)
      return 75; // Give reasonable score for participation
    }
    
    if (response.selectedAnswer === question.correctAnswer) {
      return 100;
    } else if (response.selectedAnswer !== undefined) {
      return 25; // Partial credit for attempting
    }
    
    return 0;
  }

  private static scoreSpeechResponse(response: QuestionResponse, question: AssessmentQuestion): number {
    const analysis = response.analysisData?.speechAnalysis;
    if (!analysis) return 20; // Minimal score if no analysis available

    let score = 0;
    
    // Speech clarity (30%)
    score += (analysis.clarity / 100) * 30;
    
    // Keyword presence (25%)
    const keywordScore = question.expectedKeywords ? 
      Math.min(100, (analysis.keywordsFound.length / question.expectedKeywords.length) * 100) : 75;
    score += (keywordScore / 100) * 25;
    
    // Response length/engagement (25%)
    const wordCount = analysis.transcription.trim().split(/\s+/).length;
    const lengthScore = Math.min(100, wordCount * 10); // 10 points per word, max 100
    score += (lengthScore / 100) * 25;
    
    // Confidence (20%)
    score += (analysis.confidence / 100) * 20;

    return Math.round(Math.min(100, score));
  }

  private static scoreFacialResponse(response: QuestionResponse, question: AssessmentQuestion): number {
    const analysis = response.analysisData?.facialAnalysis;
    if (!analysis) return 20;

    let score = 0;
    
    // Eye contact quality (40%)
    score += (analysis.eyeContact.quality / 100) * 40;
    
    // Overall engagement (35%)
    score += (analysis.overallEngagement / 100) * 35;
    
    // Expression appropriateness (25%)
    const positiveExpressions = analysis.expressions.filter(exp => 
      ['happy', 'engaged', 'curious', 'neutral'].includes(exp.emotion)
    );
    const expressionScore = positiveExpressions.length > 0 ? 80 : 50;
    score += (expressionScore / 100) * 25;

    return Math.round(Math.min(100, score));
  }

  private static scoreGestureResponse(response: QuestionResponse, question: AssessmentQuestion): number {
    const analysis = response.analysisData?.gestureAnalysis;
    if (!analysis) return 50; // Medium score for attempt

    let score = 0;
    
    // Appropriateness (50%)
    score += (analysis.appropriateness / 100) * 50;
    
    // Naturalness (50%)
    score += (analysis.naturalness / 100) * 50;

    return Math.round(Math.min(100, score));
  }

  private static addStrengthsAndImprovements(
    result: any, 
    question: AssessmentQuestion, 
    response: QuestionResponse
  ) {
    const score = result.score;
    
    if (score >= 80) {
      switch (question.category) {
        case 'verbal':
          result.strengths.push('Clear verbal communication');
          break;
        case 'nonverbal':
          result.strengths.push('Good eye contact and expressions');
          break;
        case 'social':
          result.strengths.push('Understanding social situations');
          break;
        case 'comfort':
          result.strengths.push('Comfortable with communication');
          break;
      }
    } else if (score < 50) {
      switch (question.category) {
        case 'verbal':
          result.improvements.push('Practice speaking clearly');
          break;
        case 'nonverbal':
          result.improvements.push('Work on eye contact');
          break;
        case 'social':
          result.improvements.push('Learn social interaction patterns');
          break;
        case 'comfort':
          result.improvements.push('Build communication confidence');
          break;
      }
    }
  }

  private static calculateDetailedMetrics(responses: QuestionResponse[]): AssessmentMetrics {
    const metrics: AssessmentMetrics = {
      speechClarity: 0,
      eyeContactDuration: 0,
      responseTime: 0,
      gestureAccuracy: 0,
      emotionRecognition: 0,
      questionFormation: 0,
      conversationFlow: 0,
      socialCueRecognition: 0
    };

    let speechResponses = 0;
    let facialResponses = 0;
    let gestureResponses = 0;

    responses.forEach(response => {
      const analysis = response.analysisData;
      
      if (analysis?.speechAnalysis) {
        metrics.speechClarity += analysis.speechAnalysis.clarity;
        speechResponses++;
      }
      
      if (analysis?.facialAnalysis) {
        metrics.eyeContactDuration += analysis.facialAnalysis.eyeContact.duration;
        metrics.emotionRecognition += analysis.facialAnalysis.overallEngagement;
        facialResponses++;
      }
      
      if (analysis?.gestureAnalysis) {
        metrics.gestureAccuracy += analysis.gestureAnalysis.appropriateness;
        gestureResponses++;
      }

      metrics.responseTime += response.responseTime;
    });

    // Calculate averages
    if (speechResponses > 0) {
      metrics.speechClarity = Math.round(metrics.speechClarity / speechResponses);
    }
    
    if (facialResponses > 0) {
      metrics.emotionRecognition = Math.round(metrics.emotionRecognition / facialResponses);
    }
    
    if (gestureResponses > 0) {
      metrics.gestureAccuracy = Math.round(metrics.gestureAccuracy / gestureResponses);
    }
    
    if (responses.length > 0) {
      metrics.responseTime = Math.round(metrics.responseTime / responses.length);
    }

    // Set reasonable defaults for other metrics
    metrics.questionFormation = 70;
    metrics.conversationFlow = 65;
    metrics.socialCueRecognition = 60;

    return metrics;
  }

  private static calculateOverallScore(categoryScores: any): number {
    return Math.round(
      categoryScores.verbalCommunication.score * CATEGORY_WEIGHTS.verbal +
      categoryScores.nonVerbalCommunication.score * CATEGORY_WEIGHTS.nonverbal +
      categoryScores.socialInteraction.score * CATEGORY_WEIGHTS.social +
      categoryScores.comfortLevel.score * CATEGORY_WEIGHTS.comfort
    );
  }

  private static determineLevel(overallScore: number): 'beginner' | 'intermediate' | 'advanced' {
    if (overallScore >= LEVEL_THRESHOLDS.advanced.min) return 'advanced';
    if (overallScore >= LEVEL_THRESHOLDS.intermediate.min) return 'intermediate';
    return 'beginner';
  }

  private static generateModuleRecommendations(
    categoryScores: any, 
    level: string
  ): string[] {
    const modules: string[] = [];
    
    // Always include basic modules
    modules.push('greetings', 'basic-conversation');
    
    if (level === 'intermediate' || level === 'advanced') {
      modules.push('sharing-experiences', 'asking-questions');
    }
    
    if (level === 'advanced') {
      modules.push('complex-scenarios', 'emotion-recognition', 'group-conversations');
    }
    
    // Add specific modules based on strengths/weaknesses
    if (categoryScores.verbalCommunication.score < 50) {
      modules.push('speech-clarity', 'vocabulary-building');
    }
    
    if (categoryScores.nonVerbalCommunication.score < 50) {
      modules.push('eye-contact-practice', 'facial-expressions');
    }
    
    if (categoryScores.socialInteraction.score < 50) {
      modules.push('social-cues', 'turn-taking');
    }

    return [...new Set(modules)]; // Remove duplicates
  }

  private static generatePersonalizedContent(
    responses: QuestionResponse[], 
    categoryScores: any
  ) {
    const preferredScenarios: string[] = [];
    const avoidScenarios: string[] = [];
    const supportNeeds: string[] = [];

    // Determine preferred scenarios based on comfort levels
    const comfortScore = categoryScores.comfortLevel.score;
    
    if (comfortScore >= 70) {
      preferredScenarios.push('group-activities', 'public-speaking', 'new-people');
    } else if (comfortScore >= 40) {
      preferredScenarios.push('familiar-settings', 'small-groups', 'structured-activities');
    } else {
      preferredScenarios.push('one-on-one', 'quiet-settings', 'familiar-people');
      avoidScenarios.push('large-groups', 'noisy-environments');
    }

    // Determine support needs
    if (categoryScores.verbalCommunication.score < 60) {
      supportNeeds.push('speech-prompts', 'visual-cues');
    }
    
    if (categoryScores.nonVerbalCommunication.score < 60) {
      supportNeeds.push('eye-contact-reminders', 'expression-modeling');
    }
    
    if (categoryScores.socialInteraction.score < 60) {
      supportNeeds.push('social-scripts', 'situation-explanations');
    }

    return {
      preferredScenarios,
      avoidScenarios,
      supportNeeds
    };
  }

  private static calculateAssessmentConfidence(responses: QuestionResponse[]): number {
    let totalConfidence = 0;
    let confidenceCount = 0;

    responses.forEach(response => {
      if (response.confidence > 0) {
        totalConfidence += response.confidence;
        confidenceCount++;
      }
    });

    return confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 70;
  }
}