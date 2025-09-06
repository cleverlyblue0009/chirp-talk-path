import { useState, useMemo } from 'react';
import { 
  ConversationalAssessmentScore, 
  ConversationHighlight, 
  DevelopmentArea, 
  Strength,
  PersonalizedGameConfig
} from '@/types/conversational-assessment';
import { ChirpCard } from '@/components/ChirpCard';
import { ChirpButton } from '@/components/ChirpButton';
import { BirdMascot } from '@/components/BirdMascot';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Star, 
  TrendingUp, 
  Heart, 
  Target, 
  Play, 
  Download, 
  Share2, 
  Calendar,
  Clock,
  Users,
  Award,
  Lightbulb,
  MessageCircle,
  Eye,
  Smile,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssessmentReportProps {
  assessmentResults: ConversationalAssessmentScore;
  gameConfiguration: PersonalizedGameConfig;
  sessionDuration: number;
  childName?: string;
  onStartGame?: () => void;
  onDownloadReport?: () => void;
  onShareReport?: () => void;
  className?: string;
}

export function AssessmentReport({
  assessmentResults,
  gameConfiguration,
  sessionDuration,
  childName = "Your child",
  onStartGame,
  onDownloadReport,
  onShareReport,
  className
}: AssessmentReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'recommendations' | 'game-config'>('overview');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Prepare chart data
  const skillsChartData = useMemo(() => {
    const { categoryScores } = assessmentResults;
    return [
      { skill: 'Verbal', score: categoryScores.verbalCommunication.score, confidence: categoryScores.verbalCommunication.confidence },
      { skill: 'Nonverbal', score: categoryScores.nonVerbalCommunication.score, confidence: categoryScores.nonVerbalCommunication.confidence },
      { skill: 'Social', score: categoryScores.socialEngagement.score, confidence: categoryScores.socialEngagement.confidence },
      { skill: 'Emotional', score: categoryScores.emotionalRegulation.score, confidence: categoryScores.emotionalRegulation.confidence },
      { skill: 'Adaptive', score: categoryScores.adaptability.score, confidence: categoryScores.adaptability.confidence }
    ];
  }, [assessmentResults]);

  const radarData = useMemo(() => {
    return skillsChartData.map(item => ({
      skill: item.skill,
      score: item.score,
      fullMark: 100
    }));
  }, [skillsChartData]);

  // Get overall assessment level
  const getOverallLevel = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 65) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 50) return { level: 'Developing', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Emerging', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  };

  const overallLevel = getOverallLevel(assessmentResults.overallScore);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Celebration */}
      <ChirpCard className="text-center space-y-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex justify-center">
          <BirdMascot 
            size="large" 
            animation="sparkle"
            showBubble
            message="Great job!"
          />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-primary">
            🎉 Assessment Complete!
          </h1>
          <p className="text-lg text-muted-foreground">
            {childName} had a wonderful conversation with the bird friends
          </p>
          
          {/* Key Stats */}
          <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{assessmentResults.conversationHighlights.length} highlights</span>
            </div>
            <div className="flex items-center space-x-1">
              <Award className="w-4 h-4" />
              <span>{assessmentResults.strengths.length} strengths</span>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className={cn(
          "inline-flex items-center space-x-2 px-6 py-3 rounded-full text-lg font-bold",
          overallLevel.bgColor,
          overallLevel.color
        )}>
          <Star className="w-6 h-6" />
          <span>Overall: {overallLevel.level} ({assessmentResults.overallScore}/100)</span>
        </div>
      </ChirpCard>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'detailed', label: 'Skills', icon: BarChart },
            { id: 'recommendations', label: 'Growth', icon: TrendingUp },
            { id: 'game-config', label: 'Game Setup', icon: Play }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.id 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Conversation Highlights */}
          <ChirpCard>
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Smile className="w-6 h-6 text-primary" />
              <span>Conversation Highlights</span>
            </h3>
            
            {assessmentResults.conversationHighlights.length > 0 ? (
              <div className="space-y-4">
                {assessmentResults.conversationHighlights.map((highlight, index) => (
                  <div key={index} className="bg-primary/5 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-primary-foreground text-sm font-bold">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary capitalize">
                          {highlight.moment.replace('_', ' ')}
                        </h4>
                        <p className="text-muted-foreground mt-1">
                          {highlight.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {highlight.skillsShown.map(skill => (
                            <span 
                              key={skill}
                              className="px-2 py-1 bg-secondary rounded-full text-xs font-medium"
                            >
                              {skill.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Every conversation is special! We're still learning about {childName}'s unique style.
              </p>
            )}
          </ChirpCard>

          {/* Strengths */}
          <ChirpCard>
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Heart className="w-6 h-6 text-red-500" />
              <span>Amazing Strengths</span>
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {assessmentResults.strengths.map((strength, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 capitalize mb-2">
                    {strength.strength.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <p className="text-green-700 text-sm mb-3">
                    {strength.description}
                  </p>
                  <div className="space-y-1">
                    {strength.examples.slice(0, 2).map((example, i) => (
                      <div key={i} className="flex items-start space-x-2">
                        <Star className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-green-600">{example}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {assessmentResults.strengths.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-2 text-primary" />
                  <p>Every child has unique strengths! We'll discover more as we continue our conversations.</p>
                </div>
              )}
            </div>
          </ChirpCard>

          {/* Quick Skills Overview */}
          <ChirpCard>
            <h3 className="text-xl font-bold mb-4">Skills at a Glance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skillsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}${name === 'confidence' ? '% confidence' : '/100'}`, 
                    name === 'score' ? 'Score' : 'Confidence'
                  ]}
                />
                <Bar dataKey="score" fill="#3b82f6" name="score" />
                <Bar dataKey="confidence" fill="#10b981" name="confidence" />
              </BarChart>
            </ResponsiveContainer>
          </ChirpCard>
        </div>
      )}

      {activeTab === 'detailed' && (
        <div className="space-y-6">
          {/* Radar Chart */}
          <ChirpCard>
            <h3 className="text-xl font-bold mb-4">Communication Profile</h3>
            <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-8">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={18} domain={[0, 100]} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex-1 space-y-4">
                {skillsChartData.map((skill, index) => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{skill.skill} Communication</span>
                      <span className="text-sm text-muted-foreground">
                        {skill.score}/100 ({skill.confidence}% confidence)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChirpCard>

          {/* Detailed Skill Analysis */}
          {Object.entries(assessmentResults.categoryScores).map(([category, score]) => (
            <ChirpCard key={category}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold capitalize">
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    score.score >= 70 ? "bg-green-100 text-green-700" :
                    score.score >= 50 ? "bg-yellow-100 text-yellow-700" :
                    "bg-orange-100 text-orange-700"
                  )}>
                    {score.score}/100
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs",
                    score.trend === 'improving' ? "bg-green-100 text-green-600" :
                    score.trend === 'needs_attention' ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {score.trend === 'improving' ? '↗️ Improving' :
                     score.trend === 'needs_attention' ? '⚠️ Needs attention' :
                     '➡️ Stable'}
                  </span>
                </div>
              </div>

              {score.evidence.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Evidence:</h4>
                  {score.evidence.map((evidence, index) => (
                    <div key={index} className="bg-muted/50 rounded p-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium capitalize">
                            {evidence.skill.replace('_', ' ')}:
                          </span>
                          <span className="ml-2">{evidence.demonstration}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            Context: {evidence.context}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChirpCard>
          ))}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Development Areas */}
          {assessmentResults.developmentAreas.length > 0 && (
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Target className="w-6 h-6 text-primary" />
                <span>Growth Opportunities</span>
              </h3>
              
              <div className="space-y-4">
                {assessmentResults.developmentAreas.map((area, index) => (
                  <div key={index} className={cn(
                    "border rounded-lg p-4",
                    area.priority === 'high' ? "border-red-200 bg-red-50" :
                    area.priority === 'medium' ? "border-yellow-200 bg-yellow-50" :
                    "border-blue-200 bg-blue-50"
                  )}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold capitalize">
                        {area.area.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        area.priority === 'high' ? "bg-red-100 text-red-700" :
                        area.priority === 'medium' ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {area.priority} priority
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Current:</span>
                        <p className="capitalize">{area.currentLevel}</p>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Target:</span>
                        <p className="capitalize">{area.targetLevel}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <span className="font-medium text-muted-foreground text-sm">Suggestions:</span>
                      <ul className="mt-2 space-y-1">
                        {area.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start space-x-2 text-sm">
                            <Lightbulb className="w-3 h-3 text-yellow-500 mt-1 flex-shrink-0" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </ChirpCard>
          )}

          {/* Building on Strengths */}
          {assessmentResults.strengths.length > 0 && (
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <span>Building on Strengths</span>
              </h3>
              
              <div className="space-y-4">
                {assessmentResults.strengths.map((strength, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2 capitalize">
                      {strength.strength.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <p className="text-green-700 text-sm mb-3">
                      {strength.description}
                    </p>
                    
                    <div>
                      <span className="font-medium text-green-800 text-sm">Ways to build on this:</span>
                      <ul className="mt-2 space-y-1">
                        {strength.buildUpon.map((suggestion, i) => (
                          <li key={i} className="flex items-start space-x-2 text-sm">
                            <Star className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                            <span className="text-green-700">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </ChirpCard>
          )}

          {/* Natural Behaviors */}
          {assessmentResults.naturalBehaviors.length > 0 && (
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">Natural Communication Patterns</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {assessmentResults.naturalBehaviors.map((behavior, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2 capitalize">
                      {behavior.behavior.replace('_', ' ')}
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Frequency:</span>
                        <span className="font-medium">{behavior.frequency} times</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Appropriateness:</span>
                        <span className="font-medium">{behavior.appropriateness}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spontaneity:</span>
                        <span className="font-medium">{behavior.spontaneity}%</span>
                      </div>
                    </div>
                    
                    {behavior.examples.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-blue-800 text-sm">Examples:</span>
                        <ul className="mt-1 space-y-1">
                          {behavior.examples.map((example, i) => (
                            <li key={i} className="text-sm text-blue-700 pl-2 border-l-2 border-blue-300">
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ChirpCard>
          )}
        </div>
      )}

      {activeTab === 'game-config' && (
        <div className="space-y-6">
          {/* Game Configuration Overview */}
          <ChirpCard>
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Play className="w-6 h-6 text-primary" />
              <span>Personalized Game Experience</span>
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Player Level */}
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <Award className="w-8 h-8 text-primary mx-auto mb-2" />
                <h4 className="font-semibold">Starting Level</h4>
                <p className="text-2xl font-bold text-primary capitalize">
                  {gameConfiguration.difficultyProgression.startingLevel}
                </p>
              </div>

              {/* Communication Style */}
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <MessageCircle className="w-8 h-8 text-secondary-foreground mx-auto mb-2" />
                <h4 className="font-semibold">Preferred Style</h4>
                <p className="text-lg font-medium capitalize">
                  {gameConfiguration.communicationStyle.preferredPace} paced
                </p>
              </div>

              {/* Bird Companions */}
              <div className="text-center p-4 bg-green-100 rounded-lg">
                <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold">Bird Friends</h4>
                <p className="text-lg font-medium">
                  {gameConfiguration.birdCompanions.length} companions
                </p>
              </div>
            </div>
          </ChirpCard>

          {/* Recommended Bird Companions */}
          <ChirpCard>
            <h3 className="text-lg font-bold mb-4">Recommended Bird Companions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gameConfiguration.birdCompanions.map(bird => (
                <div key={bird.id} className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-primary rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">
                      {bird.name.charAt(0)}
                    </span>
                  </div>
                  <h4 className="font-semibold">{bird.name}</h4>
                  <p className="text-sm text-muted-foreground capitalize">{bird.personality}</p>
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {bird.specialties.slice(0, 2).map(specialty => (
                      <span key={specialty} className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                        {specialty.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ChirpCard>

          {/* Scenario Preferences */}
          <ChirpCard>
            <h3 className="text-lg font-bold mb-4">Preferred Activity Types</h3>
            <div className="space-y-3">
              {gameConfiguration.scenarioPreferences.slice(0, 5).map((pref, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="font-medium capitalize">
                    {pref.scenarioType.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${pref.preferenceLevel}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{pref.preferenceLevel}%</span>
                  </div>
                </div>
              ))}
            </div>
          </ChirpCard>

          {/* Motivation Factors */}
          <ChirpCard>
            <h3 className="text-lg font-bold mb-4">What Motivates {childName}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {gameConfiguration.motivationFactors.slice(0, 4).map((factor, index) => (
                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 capitalize mb-2">
                    {factor.factor.replace('_', ' ')}
                  </h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm text-yellow-700">Effectiveness:</span>
                    <div className="flex-1 bg-yellow-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{ width: `${factor.effectiveness}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{factor.effectiveness}%</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    <span className="font-medium">Best for:</span> {factor.whenToUse.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </ChirpCard>

          {/* Start Game Button */}
          <div className="text-center">
            <ChirpButton
              onClick={onStartGame}
              size="lg"
              icon={Play}
              className="text-lg px-8 py-4"
            >
              Start Personalized Game Experience!
            </ChirpButton>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <ChirpButton
          onClick={onDownloadReport}
          variant="outline"
          icon={Download}
        >
          Download Report
        </ChirpButton>
        
        <ChirpButton
          onClick={onShareReport}
          variant="outline"
          icon={Share2}
        >
          Share with Therapist
        </ChirpButton>
        
        {onStartGame && (
          <ChirpButton
            onClick={onStartGame}
            icon={Play}
          >
            Start Game
          </ChirpButton>
        )}
      </div>

      {/* Technical Details Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
        </button>
        
        {showTechnicalDetails && (
          <div className="mt-4 p-4 bg-muted rounded-lg text-left">
            <h4 className="font-medium mb-2">Assessment Metadata</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Session Duration:</span> {formatDuration(sessionDuration)}
              </div>
              <div>
                <span className="font-medium">Analysis Confidence:</span> {
                  Object.values(assessmentResults.categoryScores)
                    .reduce((sum, cat) => sum + cat.confidence, 0) / 
                  Object.keys(assessmentResults.categoryScores).length
                }%
              </div>
              <div>
                <span className="font-medium">Data Points:</span> {
                  Object.values(assessmentResults.categoryScores)
                    .reduce((sum, cat) => sum + cat.evidence.length, 0)
                }
              </div>
              <div>
                <span className="font-medium">Assessment Date:</span> {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}