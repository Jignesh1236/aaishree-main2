import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Report } from "@shared/schema";

interface Goal {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  name: string;
}

interface GoalsTrackerProps {
  reports: Report[];
}

export default function GoalsTracker({ reports }: GoalsTrackerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalType, setNewGoalType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedGoals = localStorage.getItem('adsc-goals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  }, []);

  const saveGoals = (updatedGoals: Goal[]) => {
    setGoals(updatedGoals);
    localStorage.setItem('adsc-goals', JSON.stringify(updatedGoals));
  };

  const addGoal = () => {
    if (!newGoalName || !newGoalTarget) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      name: newGoalName,
      target: parseFloat(newGoalTarget),
      type: newGoalType,
    };

    saveGoals([...goals, goal]);
    setNewGoalName("");
    setNewGoalTarget("");
    setShowAddForm(false);
    toast({
      title: "Goal Added",
      description: "Your goal has been saved successfully",
    });
  };

  const deleteGoal = (id: string) => {
    saveGoals(goals.filter(g => g.id !== id));
    toast({
      title: "Goal Deleted",
      description: "Goal has been removed",
    });
  };

  const calculateProgress = (goal: Goal) => {
    const now = new Date();
    let filteredReports: Report[] = [];

    if (goal.type === 'daily') {
      const today = now.toISOString().split('T')[0];
      filteredReports = reports.filter(r => r.date === today);
    } else if (goal.type === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredReports = reports.filter(r => new Date(r.date) >= weekAgo);
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredReports = reports.filter(r => new Date(r.date) >= monthStart);
    }

    const achieved = filteredReports.reduce((sum, r) => sum + parseFloat(r.netProfit), 0);
    const progress = goal.target > 0 ? Math.min((achieved / goal.target) * 100, 100) : 0;
    
    return { achieved, progress };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Goals & Targets</CardTitle>
              <CardDescription>Track your business goals</CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)} 
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input 
                placeholder="e.g., Monthly Revenue Target"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Target Amount (₹)</Label>
                <Input 
                  type="number"
                  placeholder="50000"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newGoalType}
                  onChange={(e) => setNewGoalType(e.target.value as any)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addGoal} className="flex-1">Add Goal</Button>
              <Button onClick={() => setShowAddForm(false)} variant="outline">Cancel</Button>
            </div>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No goals set yet. Add your first goal!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const { achieved, progress } = calculateProgress(goal);
              return (
                <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{goal.name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{goal.type} Goal</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {formatCurrency(achieved)} / {formatCurrency(goal.target)}</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  {progress >= 100 && (
                    <div className="text-sm text-green-600 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Goal achieved! 🎉
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
