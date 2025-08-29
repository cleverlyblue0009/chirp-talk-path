import { useState } from 'react';
import { BirdMascot } from '@/components/BirdMascot';
import { ChirpCard } from '@/components/ChirpCard';
import { ChirpButton } from '@/components/ChirpButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Users, Brain, Plus, TrendingUp } from 'lucide-react';

export default function TherapistDashboard() {
  const [newScenario, setNewScenario] = useState({
    description: '',
    difficulty: [3],
    tags: ''
  });

  const clients = [
    { name: 'Emma J.', age: 8, sessions: 24, progress: 85 },
    { name: 'Alex M.', age: 10, sessions: 18, progress: 72 },
    { name: 'Sam K.', age: 7, sessions: 31, progress: 91 }
  ];

  const handleGenerateScenario = () => {
    console.log('Generating scenario:', newScenario);
    // AI scenario generation logic would go here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-slide-up">
          <div>
            <h1 className="text-hero font-bold gradient-text">
              Therapist Dashboard
            </h1>
            <p className="text-large text-muted-foreground mt-2">
              Clinical tools for conversation therapy
            </p>
          </div>
          <BirdMascot 
            size="medium" 
            showBubble
            message="Ready to help kids!" 
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
          <ChirpCard>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-card-foreground">{clients.length}</div>
                <div className="text-sm text-muted-foreground">Active Clients</div>
              </div>
            </div>
          </ChirpCard>

          <ChirpCard>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-card-foreground">47</div>
                <div className="text-sm text-muted-foreground">Scenarios Created</div>
              </div>
            </div>
          </ChirpCard>

          <ChirpCard>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-card-foreground">83%</div>
                <div className="text-sm text-muted-foreground">Avg Progress</div>
              </div>
            </div>
          </ChirpCard>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="clients" className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="scenarios">Add Scenario</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">Client Overview</h3>
              <div className="space-y-4">
                {clients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                    <div>
                      <h4 className="font-semibold">{client.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Age {client.age} • {client.sessions} sessions completed
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-semibold text-primary">{client.progress}%</div>
                        <div className="text-xs text-muted-foreground">Progress</div>
                      </div>
                      <ChirpButton variant="primary" size="small">
                        View Details
                      </ChirpButton>
                    </div>
                  </div>
                ))}
              </div>
            </ChirpCard>
          </TabsContent>

          <TabsContent value="analysis">
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">Clinical Analysis</h3>
              <div className="space-y-6">
                <div className="p-4 bg-primary-glow/10 rounded-2xl">
                  <h4 className="font-semibold text-primary mb-3">📊 Aggregate Insights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium mb-2">Most Challenging Areas:</div>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Group conversation dynamics (67% struggle)</li>
                        <li>• Non-verbal cue recognition (54% struggle)</li>
                        <li>• Conversation initiation (43% struggle)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium mb-2">Strongest Skills:</div>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Turn-taking in structured settings (89% proficient)</li>
                        <li>• Eye contact maintenance (84% proficient)</li>
                        <li>• Following conversation topics (81% proficient)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent/10 rounded-2xl">
                  <h4 className="font-semibold text-accent-foreground mb-3">🎯 Treatment Recommendations</h4>
                  <p className="text-sm text-muted-foreground">
                    Focus on <strong>peer interaction scenarios</strong> and <strong>social cue recognition exercises</strong>. 
                    Consider implementing more <strong>real-world practice opportunities</strong> in group settings.
                  </p>
                </div>
              </div>
            </ChirpCard>
          </TabsContent>

          <TabsContent value="scenarios">
            <ChirpCard>
              <h3 className="text-xl font-bold mb-4">Create New Scenario</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Scenario Description</label>
                  <Textarea
                    placeholder="Describe the conversation scenario you want to create..."
                    value={newScenario.description}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-32"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Difficulty Level: {newScenario.difficulty[0]}/5
                  </label>
                  <Slider
                    value={newScenario.difficulty}
                    onValueChange={(value) => setNewScenario(prev => ({ ...prev, difficulty: value }))}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Beginner</span>
                    <span>Expert</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                  <Input
                    placeholder="e.g., home, greeting, family, routine"
                    value={newScenario.tags}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>

                <div className="flex space-x-2 flex-wrap">
                  {['Home', 'School', 'Restaurant', 'Playground', 'Doctor Visit'].map((tag) => (
                    <Badge key={tag} variant="secondary" className="mb-2">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <ChirpButton 
                  variant="primary"
                  className="w-full"
                  icon={Plus}
                  onClick={handleGenerateScenario}
                >
                  Generate Scenario with AI
                </ChirpButton>

                <div className="p-4 bg-secondary/10 rounded-2xl">
                  <h4 className="font-semibold text-secondary-foreground mb-2">Preview</h4>
                  <p className="text-sm text-muted-foreground">
                    {newScenario.description || 'Enter a description to see the AI-generated scenario preview...'}
                  </p>
                </div>
              </div>
            </ChirpCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}