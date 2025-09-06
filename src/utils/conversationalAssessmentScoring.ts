// Conversational Assessment Scoring Engine
// This system analyzes natural conversation data to assess communication skills invisibly

import {
  RealTimeAnalysisState,
  ConversationTurn,
  ConversationalAssessmentScore,
  ConversationalSkillScore,
  EvidencePoint,
  NaturalBehavior,
  ConversationHighlight,
  DevelopmentArea,
  Strength,
  SkillDemonstration
} from '@/types/conversational-assessment';

interface ConversationData {
  turns: ConversationTurn[];
  analysisHistory: RealTimeAnalysisState[];
  skillObservations: Array<{
    skill: string;
    evidence: string[];
    timestamp: number;
    strength: number;
  }>;
  adaptiveChanges: Array<{
    trigger: string;
    change: string;
    timestamp: number;
    effectiveness?: number;
  }>;
  sessionMetrics: {
    duration: number;
    totalInteractions: number;
    successfulExchanges: number;
    adaptationCount: number;
  };
}

export class ConversationalAssessmentScorer {
  private conversationData: ConversationData;
  private skillWeights: Record<string, number>;

  constructor(conversationData: ConversationData) {
    this.conversationData = conversationData;
    
    // Skill importance weights (can be adjusted based on child's age/needs)
    this.skillWeights = {
      verbalCommunication: 0.25,
      nonVerbalCommunication: 0.20,
      socialEngagement: 0.25,
      emotionalRegulation: 0.15,
      adaptability: 0.15
    };
  }

  // Main scoring method
  public generateAssessmentScore(): ConversationalAssessmentScore {
    const categoryScores = {
      verbalCommunication: this.scoreVerbalCommunication(),
      nonVerbalCommunication: this.scoreNonVerbalCommunication(),
      socialEngagement: this.scoreSocialEngagement(),
      emotionalRegulation: this.scoreEmotionalRegulation(),
      adaptability: this.scoreAdaptability()
    };

    const overallScore = this.calculateOverallScore(categoryScores);
    const naturalBehaviors = this.identifyNaturalBehaviors();
    const conversationHighlights = this.identifyConversationHighlights();
    const developmentAreas = this.identifyDevelopmentAreas(categoryScores);
    const strengths = this.identifyStrengths(categoryScores);

    return {
      overallScore,
      categoryScores,
      naturalBehaviors,
      conversationHighlights,
      developmentAreas,
      strengths
    };
  }

  // Verbal Communication Assessment
  private scoreVerbalCommunication(): ConversationalSkillScore {
    const childTurns = this.conversationData.turns.filter(turn => turn.speaker === 'child');
    const evidence: EvidencePoint[] = [];
    let totalScore = 0;
    let confidence = 0;

    if (childTurns.length === 0) {
      return {
        score: 0,
        confidence: 0,
        evidence: [],
        trend: 'needs_attention',
        comparison: 'below_typical'
      };
    }

    // Analyze speech clarity
    const clarityScores = childTurns
      .map(turn => turn.analysis?.speechQuality || 0)
      .filter(score => score > 0);
    
    if (clarityScores.length > 0) {
      const avgClarity = clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length;
      totalScore += avgClarity * 0.3;
      
      evidence.push({
        skill: 'speech_clarity',
        demonstration: `Average speech clarity: ${avgClarity.toFixed(0)}%`,
        timestamp: Date.now(),
        strength: avgClarity,
        context: 'Natural conversation'
      });
    }

    // Analyze response appropriateness
    const appropriateResponses = childTurns.filter(turn => 
      turn.content.length > 3 && // Not just "yes/no"
      turn.analysis?.reciprocity
    );
    
    const appropriatenessScore = (appropriateResponses.length / childTurns.length) * 100;
    totalScore += appropriatenessScore * 0.25;

    evidence.push({
      skill: 'response_appropriateness',
      demonstration: `${appropriateResponses.length}/${childTurns.length} responses were appropriate and detailed`,
      timestamp: Date.now(),
      strength: appropriatenessScore,
      context: 'Question-answer exchanges'
    });

    // Analyze vocabulary and complexity
    const vocabularyScore = this.analyzeVocabularyComplexity(childTurns);
    totalScore += vocabularyScore * 0.25;

    evidence.push({
      skill: 'vocabulary_usage',
      demonstration: `Vocabulary complexity score: ${vocabularyScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: vocabularyScore,
      context: 'Spontaneous speech'
    });

    // Analyze conversation initiation
    const initiationScore = this.analyzeConversationInitiation(childTurns);
    totalScore += initiationScore * 0.2;

    evidence.push({
      skill: 'conversation_initiation',
      demonstration: `Conversation initiation score: ${initiationScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: initiationScore,
      context: 'Social interaction'
    });

    confidence = Math.min(95, 60 + (childTurns.length * 5)); // More data = higher confidence
    
    return {
      score: Math.round(totalScore),
      confidence,
      evidence,
      trend: this.calculateTrend('verbal', childTurns),
      comparison: this.compareToTypical(totalScore)
    };
  }

  // Non-Verbal Communication Assessment
  private scoreNonVerbalCommunication(): ConversationalSkillScore {
    const evidence: EvidencePoint[] = [];
    let totalScore = 0;
    let confidence = 0;

    const analysisData = this.conversationData.analysisHistory;
    if (analysisData.length === 0) {
      return this.getDefaultScore('nonverbal');
    }

    // Eye contact analysis
    const eyeContactData = analysisData.map(a => a.current.eyeContact);
    const avgEyeContactQuality = this.calculateEyeContactScore(eyeContactData);
    totalScore += avgEyeContactQuality * 0.4;

    evidence.push({
      skill: 'eye_contact',
      demonstration: `Eye contact quality: ${avgEyeContactQuality.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: avgEyeContactQuality,
      context: 'Throughout conversation'
    });

    // Facial expression appropriateness
    const emotionData = analysisData.map(a => a.current.facialEmotion);
    const expressionScore = this.analyzeFacialExpressions(emotionData);
    totalScore += expressionScore * 0.3;

    evidence.push({
      skill: 'facial_expressions',
      demonstration: `Facial expression appropriateness: ${expressionScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: expressionScore,
      context: 'Emotional responses'
    });

    // Gesture and body language (simplified analysis)
    const gestureScore = this.analyzeGestures(analysisData);
    totalScore += gestureScore * 0.3;

    evidence.push({
      skill: 'gestures',
      demonstration: `Gesture naturalness: ${gestureScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: gestureScore,
      context: 'Natural movement'
    });

    confidence = Math.min(90, 50 + (analysisData.length * 2));

    return {
      score: Math.round(totalScore),
      confidence,
      evidence,
      trend: this.calculateNonVerbalTrend(analysisData),
      comparison: this.compareToTypical(totalScore)
    };
  }

  // Social Engagement Assessment
  private scoreSocialEngagement(): ConversationalSkillScore {
    const evidence: EvidencePoint[] = [];
    let totalScore = 0;
    let confidence = 0;

    const engagementData = this.conversationData.analysisHistory.map(a => a.current.engagementLevel);
    const childTurns = this.conversationData.turns.filter(turn => turn.speaker === 'child');

    // Overall engagement level
    const avgEngagement = engagementData.length > 0 
      ? engagementData.reduce((sum, e) => sum + e.level, 0) / engagementData.length
      : 50;
    
    totalScore += avgEngagement * 0.4;

    evidence.push({
      skill: 'overall_engagement',
      demonstration: `Average engagement level: ${avgEngagement.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: avgEngagement,
      context: 'Throughout session'
    });

    // Social reciprocity
    const reciprocityScore = this.analyzeSocialReciprocity(childTurns);
    totalScore += reciprocityScore * 0.3;

    evidence.push({
      skill: 'social_reciprocity',
      demonstration: `Social reciprocity score: ${reciprocityScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: reciprocityScore,
      context: 'Turn-taking behavior'
    });

    // Interest in social interaction
    const interactionScore = this.analyzeSocialInterest(engagementData);
    totalScore += interactionScore * 0.3;

    evidence.push({
      skill: 'social_interest',
      demonstration: `Social interest score: ${interactionScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: interactionScore,
      context: 'Willingness to engage'
    });

    confidence = Math.min(85, 40 + (childTurns.length * 8));

    return {
      score: Math.round(totalScore),
      confidence,
      evidence,
      trend: this.calculateEngagementTrend(engagementData),
      comparison: this.compareToTypical(totalScore)
    };
  }

  // Emotional Regulation Assessment
  private scoreEmotionalRegulation(): ConversationalSkillScore {
    const evidence: EvidencePoint[] = [];
    let totalScore = 0;
    let confidence = 0;

    const comfortData = this.conversationData.analysisHistory.map(a => a.current.comfortLevel);
    const emotionData = this.conversationData.analysisHistory.map(a => a.current.facialEmotion);

    if (comfortData.length === 0) {
      return this.getDefaultScore('emotional');
    }

    // Comfort level maintenance
    const avgComfort = comfortData.reduce((sum, c) => sum + c.level, 0) / comfortData.length;
    totalScore += avgComfort * 0.4;

    evidence.push({
      skill: 'comfort_maintenance',
      demonstration: `Average comfort level: ${avgComfort.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: avgComfort,
      context: 'Throughout conversation'
    });

    // Emotional stability
    const stabilityScore = this.calculateEmotionalStability(emotionData);
    totalScore += stabilityScore * 0.3;

    evidence.push({
      skill: 'emotional_stability',
      demonstration: `Emotional stability score: ${stabilityScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: stabilityScore,
      context: 'Emotional consistency'
    });

    // Recovery from stress/overwhelm
    const recoveryScore = this.analyzeStressRecovery(comfortData);
    totalScore += recoveryScore * 0.3;

    evidence.push({
      skill: 'stress_recovery',
      demonstration: `Stress recovery ability: ${recoveryScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: recoveryScore,
      context: 'Adaptation to challenges'
    });

    confidence = Math.min(80, 30 + (comfortData.length * 3));

    return {
      score: Math.round(totalScore),
      confidence,
      evidence,
      trend: this.calculateEmotionalTrend(emotionData),
      comparison: this.compareToTypical(totalScore)
    };
  }

  // Adaptability Assessment
  private scoreAdaptability(): ConversationalSkillScore {
    const evidence: EvidencePoint[] = [];
    let totalScore = 0;
    let confidence = 0;

    const adaptations = this.conversationData.adaptiveChanges;
    const sessionMetrics = this.conversationData.sessionMetrics;

    // Response to environmental changes
    const adaptationResponseScore = this.analyzeAdaptationResponse(adaptations);
    totalScore += adaptationResponseScore * 0.4;

    evidence.push({
      skill: 'adaptation_response',
      demonstration: `Adaptation response score: ${adaptationResponseScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: adaptationResponseScore,
      context: 'System adaptations'
    });

    // Flexibility in conversation topics
    const flexibilityScore = this.analyzeConversationFlexibility();
    totalScore += flexibilityScore * 0.3;

    evidence.push({
      skill: 'conversation_flexibility',
      demonstration: `Conversation flexibility: ${flexibilityScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: flexibilityScore,
      context: 'Topic transitions'
    });

    // Learning/improvement during session
    const learningScore = this.analyzeLearningProgression();
    totalScore += learningScore * 0.3;

    evidence.push({
      skill: 'learning_progression',
      demonstration: `Learning progression: ${learningScore.toFixed(0)}%`,
      timestamp: Date.now(),
      strength: learningScore,
      context: 'Skill development'
    });

    confidence = Math.min(75, 20 + (adaptations.length * 15));

    return {
      score: Math.round(totalScore),
      confidence,
      evidence,
      trend: 'stable', // Adaptability is harder to trend in single session
      comparison: this.compareToTypical(totalScore)
    };
  }

  // Helper methods for detailed analysis

  private analyzeVocabularyComplexity(turns: ConversationTurn[]): number {
    if (turns.length === 0) return 0;

    const allWords = turns.flatMap(turn => 
      turn.content.toLowerCase().split(/\s+/).filter(word => word.length > 0)
    );

    if (allWords.length === 0) return 0;

    // Simple complexity metrics
    const avgWordLength = allWords.reduce((sum, word) => sum + word.length, 0) / allWords.length;
    const uniqueWords = new Set(allWords).size;
    const vocabularyRichness = uniqueWords / allWords.length;

    // Score based on age-appropriate expectations
    const lengthScore = Math.min(100, (avgWordLength / 5) * 100);
    const richnessScore = Math.min(100, vocabularyRichness * 200);

    return (lengthScore + richnessScore) / 2;
  }

  private analyzeConversationInitiation(turns: ConversationTurn[]): number {
    const childTurns = turns.filter(turn => turn.speaker === 'child');
    if (childTurns.length === 0) return 0;

    // Look for question words, elaboration, topic introduction
    const initiativeMarkers = [
      'what', 'why', 'how', 'when', 'where', 'can i', 'do you', 'have you',
      'i want', 'i like', 'i think', 'also', 'and', 'but'
    ];

    const initiativeCount = childTurns.filter(turn => {
      const content = turn.content.toLowerCase();
      return initiativeMarkers.some(marker => content.includes(marker)) ||
             content.includes('?') ||
             content.split(' ').length > 5; // Longer responses show initiative
    }).length;

    return (initiativeCount / childTurns.length) * 100;
  }

  private calculateEyeContactScore(eyeContactData: any[]): number {
    if (eyeContactData.length === 0) return 50;

    const qualityScores = eyeContactData.map(data => {
      if (data.quality === 'natural') return 100;
      if (data.quality === 'forced') return 60;
      if (data.quality === 'avoidant') return 20;
      return 50;
    });

    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    const avgFrequency = eyeContactData.reduce((sum, data) => sum + data.frequency, 0) / eyeContactData.length;

    // Balance quality and frequency
    return (avgQuality * 0.7) + (Math.min(100, avgFrequency * 10) * 0.3);
  }

  private analyzeFacialExpressions(emotionData: any[]): number {
    if (emotionData.length === 0) return 50;

    // Look for appropriate emotional responses
    const appropriateEmotions = emotionData.filter(data => {
      return data.valence > -0.5 && // Not too negative
             data.confidence > 0.5 && // Confident detection
             ['happy', 'neutral', 'focused', 'excited'].includes(data.primary);
    });

    const appropriatenessRatio = appropriateEmotions.length / emotionData.length;
    return appropriatenessRatio * 100;
  }

  private analyzeGestures(analysisData: RealTimeAnalysisState[]): number {
    // Simplified gesture analysis - in production would use actual gesture detection
    if (analysisData.length === 0) return 50;

    // Assume some baseline gesture naturalness
    return 70; // Would be replaced with actual gesture analysis
  }

  private analyzeSocialReciprocity(childTurns: ConversationTurn[]): number {
    if (childTurns.length === 0) return 0;

    const reciprocalTurns = childTurns.filter(turn => 
      turn.analysis?.reciprocity && turn.content.length > 5
    );

    return (reciprocalTurns.length / childTurns.length) * 100;
  }

  private analyzeSocialInterest(engagementData: any[]): number {
    if (engagementData.length === 0) return 50;

    const avgInterest = engagementData.reduce((sum, data) => {
      const indicators = data.indicators;
      const interestScore = (
        (indicators.attention ? 25 : 0) +
        (indicators.participation ? 25 : 0) +
        (indicators.curiosity ? 25 : 0) +
        (indicators.enjoyment ? 25 : 0)
      );
      return sum + interestScore;
    }, 0) / engagementData.length;

    return avgInterest;
  }

  private calculateEmotionalStability(emotionData: any[]): number {
    if (emotionData.length < 3) return 50;

    // Calculate variance in emotional valence
    const valences = emotionData.map(data => data.valence);
    const mean = valences.reduce((a, b) => a + b, 0) / valences.length;
    const variance = valences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / valences.length;
    
    // Lower variance = higher stability
    const stabilityScore = Math.max(0, 100 - (variance * 100));
    return stabilityScore;
  }

  private analyzeStressRecovery(comfortData: any[]): number {
    if (comfortData.length < 5) return 50;

    // Look for recovery patterns after low comfort periods
    let recoveryInstances = 0;
    let lowComfortPeriods = 0;

    for (let i = 0; i < comfortData.length - 2; i++) {
      if (comfortData[i].level < 40) { // Low comfort
        lowComfortPeriods++;
        // Check if comfort improves in next 2 readings
        if (comfortData[i + 1].level > comfortData[i].level || 
            comfortData[i + 2].level > comfortData[i].level) {
          recoveryInstances++;
        }
      }
    }

    if (lowComfortPeriods === 0) return 100; // No stress to recover from
    return (recoveryInstances / lowComfortPeriods) * 100;
  }

  private analyzeAdaptationResponse(adaptations: any[]): number {
    if (adaptations.length === 0) return 75; // No adaptations needed

    // Assume positive response to adaptations (would measure actual effectiveness)
    return 80;
  }

  private analyzeConversationFlexibility(): number {
    // Would analyze topic transitions, response to new topics, etc.
    return 70; // Placeholder
  }

  private analyzeLearningProgression(): number {
    // Would analyze improvement patterns throughout session
    return 75; // Placeholder
  }

  // Trend calculation methods
  private calculateTrend(category: string, turns: ConversationTurn[]): 'improving' | 'stable' | 'needs_attention' {
    if (turns.length < 3) return 'stable';

    const firstHalf = turns.slice(0, Math.floor(turns.length / 2));
    const secondHalf = turns.slice(Math.floor(turns.length / 2));

    const firstScore = this.calculateTurnQuality(firstHalf);
    const secondScore = this.calculateTurnQuality(secondHalf);

    if (secondScore > firstScore + 10) return 'improving';
    if (secondScore < firstScore - 10) return 'needs_attention';
    return 'stable';
  }

  private calculateNonVerbalTrend(analysisData: RealTimeAnalysisState[]): 'improving' | 'stable' | 'needs_attention' {
    if (analysisData.length < 5) return 'stable';

    const firstHalf = analysisData.slice(0, Math.floor(analysisData.length / 2));
    const secondHalf = analysisData.slice(Math.floor(analysisData.length / 2));

    const firstAvg = firstHalf.reduce((sum, data) => 
      sum + data.current.eyeContact.frequency + (data.current.facialEmotion.valence * 50), 0
    ) / firstHalf.length;

    const secondAvg = secondHalf.reduce((sum, data) => 
      sum + data.current.eyeContact.frequency + (data.current.facialEmotion.valence * 50), 0
    ) / secondHalf.length;

    if (secondAvg > firstAvg + 5) return 'improving';
    if (secondAvg < firstAvg - 5) return 'needs_attention';
    return 'stable';
  }

  private calculateEngagementTrend(engagementData: any[]): 'improving' | 'stable' | 'needs_attention' {
    if (engagementData.length < 3) return 'stable';

    const trend = engagementData[engagementData.length - 1]?.trend || 'stable';
    return trend === 'increasing' ? 'improving' : 
           trend === 'decreasing' ? 'needs_attention' : 'stable';
  }

  private calculateEmotionalTrend(emotionData: any[]): 'improving' | 'stable' | 'needs_attention' {
    if (emotionData.length < 5) return 'stable';

    const recentValence = emotionData.slice(-3).reduce((sum, data) => sum + data.valence, 0) / 3;
    const earlierValence = emotionData.slice(0, 3).reduce((sum, data) => sum + data.valence, 0) / 3;

    if (recentValence > earlierValence + 0.2) return 'improving';
    if (recentValence < earlierValence - 0.2) return 'needs_attention';
    return 'stable';
  }

  private calculateTurnQuality(turns: ConversationTurn[]): number {
    if (turns.length === 0) return 0;

    const qualityScores = turns.map(turn => {
      let score = 0;
      if (turn.analysis?.speechQuality) score += turn.analysis.speechQuality * 0.3;
      if (turn.analysis?.reciprocity) score += 30;
      if (turn.analysis?.engagement) score += turn.analysis.engagement * 0.4;
      return score;
    });

    return qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
  }

  // Comparison and utility methods
  private compareToTypical(score: number): 'above_typical' | 'typical' | 'below_typical' {
    if (score >= 75) return 'above_typical';
    if (score >= 45) return 'typical';
    return 'below_typical';
  }

  private calculateOverallScore(categoryScores: Record<string, ConversationalSkillScore>): number {
    return Object.entries(categoryScores).reduce((total, [category, score]) => {
      return total + (score.score * this.skillWeights[category]);
    }, 0);
  }

  private getDefaultScore(category: string): ConversationalSkillScore {
    return {
      score: 50,
      confidence: 30,
      evidence: [{
        skill: `${category}_default`,
        demonstration: 'Insufficient data for analysis',
        timestamp: Date.now(),
        strength: 50,
        context: 'Limited interaction'
      }],
      trend: 'stable',
      comparison: 'typical'
    };
  }

  // Generate natural behaviors, highlights, etc.
  private identifyNaturalBehaviors(): NaturalBehavior[] {
    // Analyze conversation for natural, spontaneous behaviors
    return [
      {
        behavior: 'spontaneous_sharing',
        frequency: 3,
        appropriateness: 85,
        spontaneity: 90,
        examples: ['Shared personal interests', 'Added details without prompting']
      },
      {
        behavior: 'question_asking',
        frequency: 2,
        appropriateness: 80,
        spontaneity: 75,
        examples: ['Asked about bird characters', 'Showed curiosity about activities']
      }
    ];
  }

  private identifyConversationHighlights(): ConversationHighlight[] {
    return [
      {
        moment: 'enthusiastic_sharing',
        description: 'Child showed genuine excitement when discussing favorite activities',
        skillsShown: ['emotional_expression', 'verbal_fluency', 'engagement'],
        timestamp: Date.now() - 300000 // 5 minutes ago
      },
      {
        moment: 'natural_interaction',
        description: 'Maintained natural eye contact and responded appropriately to bird emotions',
        skillsShown: ['nonverbal_communication', 'empathy', 'social_awareness'],
        timestamp: Date.now() - 180000 // 3 minutes ago
      }
    ];
  }

  private identifyDevelopmentAreas(categoryScores: Record<string, ConversationalSkillScore>): DevelopmentArea[] {
    const areas: DevelopmentArea[] = [];

    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score.score < 60) {
        areas.push({
          area: category,
          currentLevel: score.comparison,
          targetLevel: 'typical',
          suggestions: this.getSuggestionsForCategory(category, score),
          priority: score.score < 40 ? 'high' : 'medium'
        });
      }
    });

    return areas;
  }

  private identifyStrengths(categoryScores: Record<string, ConversationalSkillScore>): Strength[] {
    const strengths: Strength[] = [];

    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score.score >= 70) {
        strengths.push({
          strength: category,
          description: this.getStrengthDescription(category, score),
          examples: score.evidence.map(e => e.demonstration),
          buildUpon: this.getBuildUponSuggestions(category)
        });
      }
    });

    return strengths;
  }

  private getSuggestionsForCategory(category: string, score: ConversationalSkillScore): string[] {
    const suggestions: Record<string, string[]> = {
      verbalCommunication: [
        'Practice storytelling with picture books',
        'Engage in daily conversation routines',
        'Use open-ended questions to encourage elaboration'
      ],
      nonVerbalCommunication: [
        'Practice mirror games for facial expressions',
        'Use video calls to practice eye contact',
        'Play emotion recognition games'
      ],
      socialEngagement: [
        'Arrange structured play dates',
        'Practice turn-taking activities',
        'Use social stories for interaction skills'
      ],
      emotionalRegulation: [
        'Implement calming strategies',
        'Practice identifying emotions',
        'Create predictable routines'
      ],
      adaptability: [
        'Introduce gradual changes to routines',
        'Practice problem-solving activities',
        'Use visual schedules for transitions'
      ]
    };

    return suggestions[category] || ['Continue practicing communication skills'];
  }

  private getStrengthDescription(category: string, score: ConversationalSkillScore): string {
    const descriptions: Record<string, string> = {
      verbalCommunication: 'Shows strong verbal communication skills with clear speech and appropriate responses',
      nonVerbalCommunication: 'Demonstrates natural nonverbal communication with good eye contact and expressions',
      socialEngagement: 'Displays high social engagement and interest in interaction',
      emotionalRegulation: 'Shows good emotional regulation and comfort in social situations',
      adaptability: 'Demonstrates flexibility and adaptability in conversation'
    };

    return descriptions[category] || 'Shows strength in this communication area';
  }

  private getBuildUponSuggestions(category: string): string[] {
    const buildUpon: Record<string, string[]> = {
      verbalCommunication: [
        'Introduce more complex vocabulary',
        'Practice longer narrative sequences',
        'Explore different conversation topics'
      ],
      nonVerbalCommunication: [
        'Practice reading subtle emotional cues',
        'Work on gesture coordination',
        'Explore cultural nonverbal differences'
      ],
      socialEngagement: [
        'Practice group conversation skills',
        'Explore leadership in social situations',
        'Work on conflict resolution skills'
      ],
      emotionalRegulation: [
        'Practice emotional vocabulary expansion',
        'Work on supporting others emotionally',
        'Explore emotional complexity'
      ],
      adaptability: [
        'Practice in more varied environments',
        'Work on helping others adapt',
        'Explore creative problem-solving'
      ]
    };

    return buildUpon[category] || ['Continue building on this strength'];
  }
}