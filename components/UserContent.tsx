import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  Trophy, 
  TrendingUp, 
  Play, 
  Calendar,
  Award,
  BarChart3,
  Clock,
  Home
} from 'lucide-react';
import { dataService } from './dataServiceNew';
import { User, TestResult, QuizSet } from './types';

interface UserContentProps {
  currentUser: User;
  activeSection: string;
  onStartTest: (quizId?: string) => void;
}

export function UserContent({ currentUser, activeSection, onStartTest }: UserContentProps) {
  const [publishedQuizzes, setPublishedQuizzes] = useState<QuizSet[]>([]);
  const [userResults, setUserResults] = useState<TestResult[]>([]);
  const [userStats, setUserStats] = useState({
    totalTests: 0,
    averageScore: 0,
    bestScore: 0,
    recentTests: [] as TestResult[]
  });

  useEffect(() => {
    loadUserData();
  }, [currentUser.id, activeSection]);

  const loadUserData = () => {
    // For users, filter quizzes by their tenant
    const quizzes = currentUser.tenantId 
      ? dataService.getPublishedQuizzes(currentUser.tenantId)
      : dataService.getPublishedQuizzes();
    const results = dataService.getTestResultsByUser(currentUser.id);
    
    setPublishedQuizzes(quizzes);
    setUserResults(results);
    
    // Calculate user statistics
    const totalTests = results.length;
    const averageScore = totalTests > 0 ? results.reduce((sum, r) => sum + r.percentage, 0) / totalTests : 0;
    const bestScore = totalTests > 0 ? Math.max(...results.map(r => r.percentage)) : 0;
    const recentTests = results.slice(0, 5);

    setUserStats({
      totalTests,
      averageScore: Math.round(averageScore * 100) / 100,
      bestScore,
      recentTests
    });
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

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-success';
    if (percentage >= 70) return 'text-info';
    if (percentage >= 50) return 'text-warning';
    return 'text-danger';
  };

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-success text-white';
    if (percentage >= 70) return 'bg-info text-white';
    if (percentage >= 50) return 'bg-warning text-white';
    return 'bg-danger text-white';
  };

  // Dashboard Section
  if (activeSection === 'dashboard') {
    return (
      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tests Taken</p>
                  <p className="text-2xl font-semibold">{userStats.totalTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-info">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className={`text-2xl font-semibold ${getScoreColor(userStats.averageScore)}`}>
                    {userStats.averageScore}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Score</p>
                  <p className={`text-2xl font-semibold ${getScoreColor(userStats.bestScore)}`}>
                    {userStats.bestScore}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Quizzes</p>
                  <p className="text-2xl font-semibold">{publishedQuizzes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Results */}
        <Card className="border-secondary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <BarChart3 className="w-5 h-5" />
              Recent Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userStats.recentTests.length > 0 ? (
              <div className="space-y-3">
                {userStats.recentTests.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 bg-light border border-secondary rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        result.percentage >= 90 ? 'bg-success' :
                        result.percentage >= 70 ? 'bg-info' :
                        result.percentage >= 50 ? 'bg-warning' : 'bg-danger'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Quiz Attempt</p>
                          <Badge className={getScoreBadgeColor(result.percentage)}>
                            {result.score}/{result.totalQuestions}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(result.completedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(result.timeTaken)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-semibold ${getScoreColor(result.percentage)}`}>
                        {result.percentage}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.timeRemaining > 0 ? 'Completed' : 'Time expired'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No test results yet</p>
                <p className="text-sm text-muted-foreground">Take your first quiz to see results here</p>
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    );
  }

  // Available Quizzes Section  
  if (activeSection === 'quizzes') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">Available Quizzes</h2>
          <p className="text-muted-foreground">Take available quizzes and track your progress</p>
        </div>

        <Card className="border-secondary">
          <CardContent className="pt-6">
            {publishedQuizzes.length > 0 ? (
              <div className="grid gap-4">
                {publishedQuizzes.map((quiz) => {
                  const userAttemptsCount = dataService.getUserQuizSetAttempts(currentUser.id, quiz.id);
                  const bestAttempt = dataService.getUserBestScoreForQuiz(currentUser.id, quiz.id);

                  return (
                    <div key={quiz.id} className="flex items-center justify-between p-4 bg-light border border-secondary rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-primary">{quiz.name}</h3>
                          <Badge className="bg-info text-white">{quiz.questions.length} questions</Badge>
                          {bestAttempt !== null && (
                            <Badge className={getScoreBadgeColor(bestAttempt)}>
                              Best: {bestAttempt}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-2">{quiz.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>⏱️ {Math.floor((quiz.questions.length * 90) / 60)}:{((quiz.questions.length * 90) % 60).toString().padStart(2, '0')} total time</span>
                          <span>📝 {userAttemptsCount} attempts</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => onStartTest(quiz.id)}
                          className="bg-success hover:bg-success/90 text-white"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Quiz
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No quizzes available at the moment</p>
                <p className="text-sm text-muted-foreground">Check back later for new content</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results Section
  if (activeSection === 'results') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">My Test Results</h2>
          <p className="text-muted-foreground">View your complete test history and performance</p>
        </div>

        <Card className="border-secondary">
          <CardHeader>
            <CardTitle className="text-primary">All Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {userResults.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {userResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 bg-light border border-secondary rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        result.percentage >= 90 ? 'bg-success' :
                        result.percentage >= 70 ? 'bg-info' :
                        result.percentage >= 50 ? 'bg-warning' : 'bg-danger'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Quiz Attempt</p>
                          <Badge className={getScoreBadgeColor(result.percentage)}>
                            {result.score}/{result.totalQuestions}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(result.completedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(result.timeTaken)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-semibold ${getScoreColor(result.percentage)}`}>
                        {result.percentage}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.timeRemaining > 0 ? 'Completed' : 'Time expired'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No test results yet</p>
                <p className="text-sm text-muted-foreground">Take your first quiz to see results here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <div className="p-6">Section not found</div>;
}