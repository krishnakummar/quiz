import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  FileText, 
  Plus, 
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  Trophy,
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
  UserPlus,
  Settings,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { dataService } from './dataServiceNew';
import { User, QuizSet, TestResult } from './types';
import { QuizManager } from './QuizManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface AdminContentProps {
  currentUser: User;
  activeSection: string;
  onStartTest: (quizId?: string) => void;
}

export function AdminContent({ currentUser, activeSection, onStartTest }: AdminContentProps) {
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // For admin users, filter data by their tenant
    if (currentUser.tenantId) {
      setQuizSets(dataService.getQuizSets(currentUser.tenantId));
      setTestResults(dataService.getTestResults(currentUser.tenantId));
      setUsers(dataService.getUsersByTenant(currentUser.tenantId));
      setStatistics(dataService.getTestStatistics(currentUser.tenantId));
    } else {
      // Fallback for older data
      setQuizSets(dataService.getQuizSets());
      setTestResults(dataService.getTestResults());
      setUsers(dataService.getUsers());
      setStatistics(dataService.getTestStatistics());
    }
  };

  const handlePublishQuiz = (quizId: string, isPublished: boolean) => {
    if (isPublished) {
      dataService.unpublishQuiz(quizId);
      toast.success('Quiz unpublished successfully');
    } else {
      dataService.publishQuiz(quizId);
      toast.success('Quiz published successfully');
    }
    loadData();
  };

  const handleDeleteQuiz = (quizId: string) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      dataService.deleteQuizSet(quizId);
      toast.success('Quiz deleted successfully');
      loadData();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCreateUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newUser.password.length < 3) {
      toast.error('Password must be at least 3 characters long');
      return;
    }

    if (!currentUser.tenantId) {
      toast.error('Cannot create user: admin must belong to a tenant');
      return;
    }

    try {
      dataService.createUser(newUser.name, newUser.email, newUser.password, newUser.role, currentUser.tenantId);
      toast.success(`User "${newUser.name}" created successfully! Password: ${newUser.password}`);
      setIsCreateUserDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'user'
      });
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  // Overview Section
  if (activeSection === 'overview') {
    return (
      <div className="p-6 space-y-6">
        {/* Database Status */}
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-success">Database Status: Connected</p>
                  <p className="text-sm text-muted-foreground">Using localStorage-based relational database with normalized schema</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dataService.resetDemoData();
                    loadData();
                    toast.success('Demo data reset! Fresh accounts and sample data loaded.');
                  }}
                  className="text-xs text-muted-foreground hover:text-success"
                >
                  🔄 Reset Data
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const blob = await dataService.exportDatabase();
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `aws-quiz-database-${new Date().toISOString().split('T')[0]}.db`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      toast.success('Database exported successfully!');
                    } catch (error) {
                      toast.error('Failed to export database');
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-info"
                >
                  📁 Export
                </Button>
                <Badge className="bg-success text-white">Local RDBMS</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                  <p className="text-2xl font-semibold">{quizSets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tests Taken</p>
                  <p className="text-2xl font-semibold">{statistics.totalTests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-info">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-semibold">{statistics.uniqueUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                  <p className="text-2xl font-semibold">{statistics.averageScore || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Distribution */}
        {statistics.scoreDistribution && (
          <Card className="border-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" />
                Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-success/10 border border-success rounded-lg">
                  <div className="text-2xl font-semibold text-success">{statistics.scoreDistribution.excellent}</div>
                  <div className="text-sm text-success">Excellent (90-100%)</div>
                </div>
                <div className="text-center p-4 bg-info/10 border border-info rounded-lg">
                  <div className="text-2xl font-semibold text-info">{statistics.scoreDistribution.good}</div>
                  <div className="text-sm text-info">Good (70-89%)</div>
                </div>
                <div className="text-center p-4 bg-warning/10 border border-warning rounded-lg">
                  <div className="text-2xl font-semibold text-warning">{statistics.scoreDistribution.average}</div>
                  <div className="text-sm text-warning">Average (50-69%)</div>
                </div>
                <div className="text-center p-4 bg-danger/10 border border-danger rounded-lg">
                  <div className="text-2xl font-semibold text-danger">{statistics.scoreDistribution.poor}</div>
                  <div className="text-sm text-danger">Needs Improvement (&lt;50%)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" />
              Recent Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {testResults.slice(0, 5).map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-light border border-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        result.percentage >= 90 ? 'bg-success' :
                        result.percentage >= 70 ? 'bg-info' :
                        result.percentage >= 50 ? 'bg-warning' : 'bg-danger'
                      }`}></div>
                      <div>
                        <p className="font-medium">{result.userName}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(result.completedAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${
                        result.percentage >= 90 ? 'bg-success' :
                        result.percentage >= 70 ? 'bg-info' :
                        result.percentage >= 50 ? 'bg-warning' : 'bg-danger'
                      } text-white`}>
                        {result.score}/{result.totalQuestions} ({result.percentage}%)
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDuration(result.timeTaken)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>No test results yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz Management Section
  if (activeSection === 'quizzes') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Quiz Management</h2>
            <p className="text-muted-foreground">Create, edit, and manage quiz content</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz
          </Button>
        </div>

        {isCreateDialogOpen && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Quiz</DialogTitle>
              </DialogHeader>
              <QuizManager
                questions={[]}
                onQuestionsUpdate={() => {}}
                isCustomQuestions={false}
                onToggleQuestionSource={() => {}}
                showCreateForm={true}
                onCreateQuiz={(name, description, questions) => {
                  dataService.createQuizSet(name, description, questions, currentUser.id, currentUser.tenantId);
                  toast.success('Quiz created successfully!');
                  setIsCreateDialogOpen(false);
                  loadData();
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        <div className="grid gap-4">
          {quizSets.map((quiz) => (
            <Card key={quiz.id} className="border-secondary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg text-primary">{quiz.name}</CardTitle>
                      <Badge className={quiz.isPublished ? "bg-success text-white" : "bg-secondary text-white"}>
                        {quiz.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{quiz.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{quiz.questions.length} questions</span>
                      <span>Created {formatDate(quiz.createdAt)}</span>
                      {quiz.updatedAt !== quiz.createdAt && (
                        <span>Updated {formatDate(quiz.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePublishQuiz(quiz.id, quiz.isPublished)}
                      className={quiz.isPublished 
                        ? "border-warning text-warning hover:bg-warning hover:text-white"
                        : "border-success text-success hover:bg-success hover:text-white"
                      }
                    >
                      {quiz.isPublished ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="border-danger text-danger hover:bg-danger hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {quizSets.length === 0 && (
            <Card className="border-dashed border-secondary">
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No quizzes created yet</h3>
                <p className="text-muted-foreground mb-4">Create your first quiz to get started</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Quiz
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Results Section
  if (activeSection === 'results') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">Test Results</h2>
          <p className="text-muted-foreground">View and analyze all test attempts</p>
        </div>

        <Card className="border-secondary">
          <CardHeader>
            <CardTitle className="text-primary">All Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {testResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 bg-light border border-secondary rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        result.percentage >= 90 ? 'bg-success' :
                        result.percentage >= 70 ? 'bg-info' :
                        result.percentage >= 50 ? 'bg-warning' : 'bg-danger'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{result.userName}</p>
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            {result.userEmail}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(result.completedAt)} • {formatDuration(result.timeTaken)} duration
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          result.percentage >= 90 ? 'bg-success' :
                          result.percentage >= 70 ? 'bg-info' :
                          result.percentage >= 50 ? 'bg-warning' : 'bg-danger'
                        } text-white`}>
                          {result.score}/{result.totalQuestions}
                        </Badge>
                        <span className="text-lg font-semibold">{result.percentage}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.timeRemaining > 0 ? `${formatDuration(result.timeRemaining)} remaining` : 'Time expired'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>No test results available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Users Section
  if (activeSection === 'users') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">User Management</h2>
            <p className="text-muted-foreground">View and manage registered users within your tenant</p>
          </div>
          <Button 
            onClick={() => setIsCreateUserDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Create User Dialog */}
        <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name *</Label>
                <Input
                  id="user-name"
                  placeholder="User's full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email Address *</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password *</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Enter password (min 3 characters)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>User Role *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newUser.role === 'user' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewUser({...newUser, role: 'user'})}
                    className={newUser.role === 'user' 
                      ? 'bg-primary text-white flex-1' 
                      : 'border-primary text-primary hover:bg-primary hover:text-white flex-1'
                    }
                  >
                    <GraduationCap className="w-4 h-4 mr-1" />
                    Student
                  </Button>
                  <Button
                    type="button"
                    variant={newUser.role === 'admin' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewUser({...newUser, role: 'admin'})}
                    className={newUser.role === 'admin' 
                      ? 'bg-warning text-white flex-1' 
                      : 'border-warning text-warning hover:bg-warning hover:text-white flex-1'
                    }
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Admins can manage quizzes and users within this tenant
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateUser} 
                  className="flex-1 bg-success hover:bg-success/90 text-white"
                >
                  Create User
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateUserDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="border-secondary">
          <CardHeader>
            <CardTitle className="text-primary">Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <div className="space-y-3">
                {users.map((user) => {
                  const userResults = testResults.filter(r => r.userId === user.id);
                  const averageScore = userResults.length > 0 
                    ? userResults.reduce((sum, r) => sum + r.percentage, 0) / userResults.length 
                    : 0;

                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-light border border-secondary rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          user.role === 'admin' ? 'bg-warning/10' : 'bg-primary/10'
                        }`}>
                          <Users className={`w-5 h-5 ${
                            user.role === 'admin' ? 'text-warning' : 'text-primary'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            <Badge className={user.role === 'admin' ? "bg-warning text-white" : "bg-primary text-white"}>
                              {user.role === 'admin' ? 'Tenant Admin' : 'Student'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-info text-info">
                            {userResults.length} tests
                          </Badge>
                          {userResults.length > 0 && (
                            <Badge className="bg-success text-white">
                              {Math.round(averageScore)}% avg
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No users in your tenant yet</h3>
                <p className="text-muted-foreground mb-4">Create your first user to get started</p>
                <Button 
                  onClick={() => setIsCreateUserDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Your First User
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="p-6">Section not found</div>;
}