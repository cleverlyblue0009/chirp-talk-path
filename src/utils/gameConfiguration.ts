import { AssessmentResults, GameConfiguration, ScenarioConfig } from '@/types/assessment';

export class GameConfigurationManager {
  
  static generateGameConfig(assessmentResults: AssessmentResults | null): GameConfiguration {
    // Default configuration if no assessment results
    if (!assessmentResults) {
      return this.getDefaultConfiguration();
    }

    const level = assessmentResults.recommendedLevel;
    const categoryScores = assessmentResults.categoryScores;
    const personalizedContent = assessmentResults.personalizedContent;

    return {
      playerLevel: level,
      unlockedModules: this.generateUnlockedModules(level, categoryScores),
      currentScore: assessmentResults.overallScore,
      streak: 0, // Initial value
      lives: 5, // Initial value
      availableScenarios: this.generateScenarios(level, categoryScores),
      personalizedContent: this.generatePersonalizedSettings(assessmentResults),
      adaptiveSettings: this.generateAdaptiveSettings(level, categoryScores)
    };
  }

  private static getDefaultConfiguration(): GameConfiguration {
    return {
      playerLevel: 'beginner',
      unlockedModules: ['greetings', 'basic-conversation'],
      currentScore: 0,
      streak: 0,
      lives: 5,
      availableScenarios: [
        {
          id: 'home',
          title: 'At Home',
          difficulty: 'easy',
          category: 'family',
          unlocked: true,
          recommended: true,
          supportLevel: 'high'
        }
      ],
      personalizedContent: {
        preferredTopics: ['family', 'toys', 'food'],
        communicationStyle: 'mixed',
        pacePreference: 'medium',
        feedbackStyle: 'encouraging'
      },
      adaptiveSettings: {
        questionTimeouts: 30,
        hintFrequency: 'often',
        difficultyAdjustment: true,
        skipOption: true,
        repeatOption: true
      }
    };
  }

  private static generateUnlockedModules(
    level: 'beginner' | 'intermediate' | 'advanced',
    categoryScores: any
  ): string[] {
    const modules: string[] = [];

    // Base modules for all levels
    modules.push('greetings', 'basic-conversation');

    // Level-based unlocks
    if (level === 'intermediate' || level === 'advanced') {
      modules.push('sharing-experiences', 'asking-questions', 'school-conversations');
    }

    if (level === 'advanced') {
      modules.push('complex-scenarios', 'group-conversations', 'public-speaking');
    }

    // Strength-based unlocks
    if (categoryScores.verbalCommunication.score >= 70) {
      modules.push('storytelling', 'descriptive-language');
    }

    if (categoryScores.nonVerbalCommunication.score >= 70) {
      modules.push('emotion-recognition', 'body-language');
    }

    if (categoryScores.socialInteraction.score >= 70) {
      modules.push('turn-taking', 'conflict-resolution');
    }

    // Support-based modules
    if (categoryScores.verbalCommunication.score < 50) {
      modules.push('speech-clarity', 'vocabulary-building');
    }

    if (categoryScores.nonVerbalCommunication.score < 50) {
      modules.push('eye-contact-practice', 'facial-expressions');
    }

    if (categoryScores.socialInteraction.score < 50) {
      modules.push('social-cues', 'conversation-starters');
    }

    return [...new Set(modules)]; // Remove duplicates
  }

  private static generateScenarios(
    level: 'beginner' | 'intermediate' | 'advanced',
    categoryScores: any
  ): ScenarioConfig[] {
    const scenarios: ScenarioConfig[] = [];

    // Home scenario - always available
    scenarios.push({
      id: 'home',
      title: 'At Home',
      difficulty: 'easy',
      category: 'family',
      unlocked: true,
      recommended: level === 'beginner',
      supportLevel: this.getSupportLevel(categoryScores.comfortLevel.score)
    });

    // School scenario
    if (level === 'intermediate' || level === 'advanced') {
      scenarios.push({
        id: 'school',
        title: 'At School',
        difficulty: level === 'intermediate' ? 'medium' : 'easy',
        category: 'education',
        unlocked: true,
        recommended: level === 'intermediate',
        supportLevel: this.getSupportLevel(categoryScores.socialInteraction.score)
      });
    } else if (categoryScores.socialInteraction.score >= 60) {
      // Unlock school early if social skills are good
      scenarios.push({
        id: 'school',
        title: 'At School',
        difficulty: 'medium',
        category: 'education',
        unlocked: true,
        recommended: false,
        supportLevel: 'moderate'
      });
    }

    // Restaurant scenario
    if (level === 'advanced' || 
        (level === 'intermediate' && categoryScores.verbalCommunication.score >= 70)) {
      scenarios.push({
        id: 'restaurant',
        title: 'At a Restaurant',
        difficulty: level === 'advanced' ? 'medium' : 'hard',
        category: 'public',
        unlocked: true,
        recommended: level === 'advanced',
        supportLevel: this.getSupportLevel(categoryScores.verbalCommunication.score)
      });
    }

    // Playground scenario
    if (level === 'intermediate' || level === 'advanced') {
      scenarios.push({
        id: 'playground',
        title: 'At the Playground',
        difficulty: 'medium',
        category: 'social',
        unlocked: categoryScores.socialInteraction.score >= 50,
        recommended: categoryScores.socialInteraction.score >= 70,
        supportLevel: this.getSupportLevel(categoryScores.socialInteraction.score)
      });
    }

    // Store scenario (advanced)
    if (level === 'advanced') {
      scenarios.push({
        id: 'store',
        title: 'At the Store',
        difficulty: 'hard',
        category: 'public',
        unlocked: true,
        recommended: categoryScores.verbalCommunication.score >= 80,
        supportLevel: this.getSupportLevel(categoryScores.verbalCommunication.score)
      });
    }

    // Doctor visit (special scenario based on comfort level)
    if (categoryScores.comfortLevel.score >= 60) {
      scenarios.push({
        id: 'doctor',
        title: 'Doctor Visit',
        difficulty: level === 'beginner' ? 'medium' : 'easy',
        category: 'healthcare',
        unlocked: true,
        recommended: false,
        supportLevel: 'high'
      });
    }

    return scenarios;
  }

  private static generatePersonalizedSettings(assessmentResults: AssessmentResults) {
    const categoryScores = assessmentResults.categoryScores;
    const personalizedContent = assessmentResults.personalizedContent;

    // Determine preferred topics based on assessment responses and level
    let preferredTopics = ['family', 'friends'];
    
    if (categoryScores.verbalCommunication.score >= 70) {
      preferredTopics.push('storytelling', 'adventures');
    }
    
    if (categoryScores.socialInteraction.score >= 70) {
      preferredTopics.push('group-activities', 'teamwork');
    }

    // Add topics from assessment results
    if (personalizedContent.preferredScenarios) {
      preferredTopics.push(...personalizedContent.preferredScenarios);
    }

    // Determine communication style
    let communicationStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed' = 'mixed';
    
    if (categoryScores.nonVerbalCommunication.score > categoryScores.verbalCommunication.score + 20) {
      communicationStyle = 'visual';
    } else if (categoryScores.verbalCommunication.score > categoryScores.nonVerbalCommunication.score + 20) {
      communicationStyle = 'auditory';
    }

    // Determine pace preference
    let pacePreference: 'slow' | 'medium' | 'fast' = 'medium';
    
    if (categoryScores.comfortLevel.score < 50) {
      pacePreference = 'slow';
    } else if (assessmentResults.overallScore >= 80) {
      pacePreference = 'fast';
    }

    // Determine feedback style
    let feedbackStyle: 'encouraging' | 'detailed' | 'minimal' = 'encouraging';
    
    if (assessmentResults.overallScore >= 80) {
      feedbackStyle = 'detailed';
    } else if (categoryScores.comfortLevel.score >= 80) {
      feedbackStyle = 'minimal';
    }

    return {
      preferredTopics: [...new Set(preferredTopics)],
      communicationStyle,
      pacePreference,
      feedbackStyle
    };
  }

  private static generateAdaptiveSettings(
    level: 'beginner' | 'intermediate' | 'advanced',
    categoryScores: any
  ) {
    // Question timeouts based on level and verbal communication score
    let questionTimeouts = 30; // Default 30 seconds
    
    if (level === 'beginner' || categoryScores.verbalCommunication.score < 50) {
      questionTimeouts = 45;
    } else if (level === 'advanced' && categoryScores.verbalCommunication.score >= 80) {
      questionTimeouts = 20;
    }

    // Hint frequency based on overall performance
    let hintFrequency: 'never' | 'rarely' | 'sometimes' | 'often' = 'sometimes';
    
    if (categoryScores.comfortLevel.score < 50) {
      hintFrequency = 'often';
    } else if (categoryScores.comfortLevel.score >= 80) {
      hintFrequency = 'rarely';
    }

    // Difficulty adjustment based on consistency of scores
    const scoreVariance = Math.abs(
      Math.max(
        categoryScores.verbalCommunication.score,
        categoryScores.nonVerbalCommunication.score,
        categoryScores.socialInteraction.score
      ) - Math.min(
        categoryScores.verbalCommunication.score,
        categoryScores.nonVerbalCommunication.score,
        categoryScores.socialInteraction.score
      )
    );

    const difficultyAdjustment = scoreVariance > 30; // Adjust if scores are very different

    return {
      questionTimeouts,
      hintFrequency,
      difficultyAdjustment,
      skipOption: categoryScores.comfortLevel.score < 70,
      repeatOption: categoryScores.verbalCommunication.score < 60
    };
  }

  private static getSupportLevel(score: number): 'minimal' | 'moderate' | 'high' {
    if (score >= 80) return 'minimal';
    if (score >= 60) return 'moderate';
    return 'high';
  }

  // Helper method to get current game state
  static getCurrentGameState(): GameConfiguration {
    try {
      const savedResults = localStorage.getItem('chirp_assessment_results');
      const savedGameState = localStorage.getItem('chirp_game_state');
      
      let assessmentResults: AssessmentResults | null = null;
      if (savedResults) {
        assessmentResults = JSON.parse(savedResults);
      }

      // Generate base configuration from assessment
      const baseConfig = this.generateGameConfig(assessmentResults);

      // Override with saved game state if available
      if (savedGameState) {
        const gameState = JSON.parse(savedGameState);
        return {
          ...baseConfig,
          currentScore: gameState.currentScore || baseConfig.currentScore,
          streak: gameState.streak || 0,
          lives: gameState.lives || 5
        };
      }

      return baseConfig;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return this.getDefaultConfiguration();
    }
  }

  // Helper method to save game state
  static saveGameState(gameState: Partial<GameConfiguration>) {
    try {
      const currentState = this.getCurrentGameState();
      const updatedState = { ...currentState, ...gameState };
      localStorage.setItem('chirp_game_state', JSON.stringify(updatedState));
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }
}