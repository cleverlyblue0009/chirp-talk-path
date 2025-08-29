import { useState } from 'react';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpCard } from '@/components/ChirpCard';
import { ChirpButton } from '@/components/ChirpButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Award, Clock, Users } from 'lucide-react';

export default function ParentDashboard() {
  const [selectedChild] = useState('Emma');
  
  const progressData = [
    { day: 'Mon', progress: 65 },
    { day: 'Tue', progress: 72 },
    { day: 'Wed', progress: 68 },
    { day: 'Thu', progress: 85 },
    { day: 'Fri', progress: 90 },
    { day: 'Sat', progress: 78 },
    { day: 'Sun', progress: 82 }
  ];

  const scenarioData = [
    { scenario: 'Home', completed: 12, total: 15 },
    { scenario: 'School', completed: 8, total: 12 },
    { scenario: 'Restaurant', completed: 3, total: 8 },
    { scenario: 'Playground', completed: 1, total: 6 }
  ];

  const stats = {
    totalLessons: 24,
    currentStreak: 7,
    averageScore: 85,
    hoursSpent: 12.5
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-secondary/10 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-slide-up">
          <div>
            <h1 className="text-hero font-bold gradient-text">
              {selectedChild}'s Progress
            </h1>
            <p className="text-large text-muted-foreground mt-2">
              Track conversation skills development
            </p>
          </div>
          <BirdMascot 
            size="medium" 
            showBubble
            message="Great parenting!" 
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <ChirpCard>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-card-foreground">{stats.totalLessons}</div>
              <div className="text-sm text-muted-foreground">Lessons</div>
            </div>
          </ChirpCard>

          <ChirpCard>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-card-foreground">{stats.currentStreak}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>
          </ChirpCard>

          <ChirpCard>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="text-2xl font-bold text-card-foreground">{stats.averageScore}%</div>
              <div className="text-sm text-muted-foreground">Avg Score</div>
            </div>
          </ChirpCard>

          <ChirpCard>
            <div className="text-center">
              <div className="w-12 h-12 bg-highlight rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-highlight-foreground" />
              </div>
              <div className="text-2xl font-bold text-card-foreground">{stats.hoursSpent}h</div>
              <div className="text-sm text-muted-foreground">Practice Time</div>
            </div>
          </ChirpCard>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="progress" className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="manage">Manage Kids</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">Weekly Progress</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Line 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChirpCard>

            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">Scenario Progress</h3>
              <div className="space-y-4">
                {scenarioData.map((item) => (
                  <div key={item.scenario}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{item.scenario}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.completed}/{item.total}
                      </span>
                    </div>
                    <Progress 
                      value={(item.completed / item.total) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </ChirpCard>
          </TabsContent>

          <TabsContent value="analysis">
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">AI Analysis Summary</h3>
              <div className="space-y-4">
                <div className="p-4 bg-primary-glow/20 rounded-2xl">
                  <h4 className="font-semibold text-primary mb-2">✨ Key Strengths</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <strong>Excellent eye contact</strong> during conversations</li>
                    <li>• <strong>Active listening skills</strong> are improving rapidly</li>
                    <li>• <strong>Turn-taking</strong> in conversations is becoming natural</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-accent/20 rounded-2xl">
                  <h4 className="font-semibold text-accent-foreground mb-2">🎯 Areas to Practice</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <strong>Asking follow-up questions</strong> in conversations</li>
                    <li>• <strong>Reading social cues</strong> in group settings</li>
                    <li>• <strong>Initiating conversations</strong> with new people</li>
                  </ul>
                </div>

                <div className="p-4 bg-secondary/20 rounded-2xl">
                  <h4 className="font-semibold text-secondary-foreground mb-2">📈 Recommendations</h4>
                  <p className="text-sm text-muted-foreground">
                    Continue with <strong>restaurant scenarios</strong> to practice ordering and polite requests. 
                    Consider introducing <strong>playground interactions</strong> to work on group dynamics.
                  </p>
                </div>
              </div>
            </ChirpCard>
          </TabsContent>

          <TabsContent value="manage">
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">Linked Children</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary-glow/10 rounded-2xl">
                  <div>
                    <h4 className="font-semibold">Emma Johnson</h4>
                    <p className="text-sm text-muted-foreground">Age 8 • Active</p>
                  </div>
                  <ChirpButton variant="primary" size="small">
                    View Progress
                  </ChirpButton>
                </div>
                
                <ChirpButton variant="accent" className="w-full">
                  Add Another Child
                </ChirpButton>
              </div>
            </ChirpCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}