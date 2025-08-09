import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { CheckCircle, XCircle, RefreshCw, Clock, AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { dataService } from './dataServiceNew';
import { User, QuizQuestion, TestResult } from './types';

interface TestInterfaceProps {
  currentUser: User;
  quizId?: string;
  onTestComplete: (result: TestResult) => void;
  onBackToDashboard: () => void;
}

export function TestInterface({ currentUser, quizId, onTestComplete, onBackToDashboard }: TestInterfaceProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Map<number, 'answered' | 'skipped' | 'unanswered'>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeTest();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizId]);

  const initializeTest = () => {
    let quizQuestions: QuizQuestion[] = [];

    if (quizId) {
      // Load specific quiz - filter by tenant if user belongs to one
      const publishedQuizzes = currentUser.tenantId 
        ? dataService.getPublishedQuizzes(currentUser.tenantId)
        : dataService.getPublishedQuizzes();
      const selectedQuiz = publishedQuizzes.find(q => q.id === quizId);
      if (selectedQuiz) {
        quizQuestions = selectedQuiz.questions;
      }
    } else {
      // Load default quiz (for admin preview) - filter by tenant if applicable
      const quizSets = currentUser.tenantId 
        ? dataService.getQuizSets(currentUser.tenantId)
        : dataService.getQuizSets();
      const defaultQuiz = quizSets.find(q => q.isPublished);
      if (defaultQuiz) {
        quizQuestions = defaultQuiz.questions.slice(0, 6); // Limit to 6 for preview
      }
    }

    if (quizQuestions.length === 0) {
      toast.error('No questions available for this quiz');
      onBackToDashboard();
      return;
    }

    // Shuffle questions for variety
    const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);

    // Initialize test state
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswers([]);
    setShowResult(false);
    setGameComplete(false);
    setUserAnswers([]);
    setSkippedQuestions(new Set());
    setShowReviewScreen(false);
    setQuestionStatuses(new Map());
    setStartTime(new Date());

    // Setup timer (90 seconds per question)
    const totalTime = shuffled.length * 90;
    setTimeRemaining(totalTime);
    setIsTimerActive(true);
  };

  // Timer countdown effect
  useEffect(() => {
    if (isTimerActive && timeRemaining > 0 && !gameComplete && !showResult && !showReviewScreen) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            completeTest(true); // Auto-complete when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerActive, timeRemaining, gameComplete, showResult, showReviewScreen]);

  // Show warning when time is running low
  useEffect(() => {
    if (timeRemaining === 60 && isTimerActive) {
      toast.warning("⏰ 1 minute remaining!");
    } else if (timeRemaining === 30 && isTimerActive) {
      toast.warning("⏰ 30 seconds remaining!");
    }
  }, [timeRemaining, isTimerActive]);

  const handleSingleAnswerSelect = (answer: string) => {
    if (showResult) return;
    setSelectedAnswers([answer]);
  };

  const handleMultipleAnswerToggle = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswers(prev => {
      if (prev.includes(answer)) {
        return prev.filter(a => a !== answer);
      } else {
        return [...prev, answer];
      }
    });
  };

  const isAnswerCorrect = (question: QuizQuestion, selectedAnswers: string[]): boolean => {
    if (question.choice_type === "radio") {
      return selectedAnswers.length === 1 && selectedAnswers[0] === question.correct_answer;
    } else {
      const correctAnswers = Array.isArray(question.correct_answer) 
        ? question.correct_answer 
        : [question.correct_answer];
      
      return selectedAnswers.length === correctAnswers.length &&
             selectedAnswers.every(answer => correctAnswers.includes(answer));
    }
  };

  const handleSubmit = () => {
    if (selectedAnswers.length === 0) return;
    
    setShowResult(true);
    
    const currentQuizQuestion = questions[currentQuestion];
    const correctAnswers = Array.isArray(currentQuizQuestion.correct_answer) 
      ? currentQuizQuestion.correct_answer 
      : [currentQuizQuestion.correct_answer];
    
    const isCorrect = isAnswerCorrect(currentQuizQuestion, selectedAnswers);
    
    // Check if this question was previously answered
    const existingAnswerIndex = userAnswers.findIndex(answer => answer.questionIndex === currentQuestion);
    
    const answerRecord = {
      questionIndex: currentQuestion,
      question: currentQuizQuestion.question,
      selectedAnswers: [...selectedAnswers],
      correctAnswers: [...correctAnswers],
      isCorrect
    };
    
    if (existingAnswerIndex >= 0) {
      // Update existing answer
      const updatedAnswers = [...userAnswers];
      const wasCorrectBefore = updatedAnswers[existingAnswerIndex].isCorrect;
      updatedAnswers[existingAnswerIndex] = answerRecord;
      setUserAnswers(updatedAnswers);
      
      // Update score
      if (wasCorrectBefore && !isCorrect) {
        setScore(score - 1);
      } else if (!wasCorrectBefore && isCorrect) {
        setScore(score + 1);
      }
    } else {
      // New answer
      setUserAnswers(prev => [...prev, answerRecord]);
      if (isCorrect) {
        setScore(score + 1);
      }
    }
  };

  const handleSkipQuestion = () => {
    if (showResult) return;
    
    // Mark question as skipped
    const newSkipped = new Set(skippedQuestions);
    newSkipped.add(currentQuestion);
    setSkippedQuestions(newSkipped);
    
    // Update question status
    const newStatuses = new Map(questionStatuses);
    newStatuses.set(currentQuestion, 'skipped');
    setQuestionStatuses(newStatuses);
    
    // Move to next question or review screen
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswers([]);
      setShowResult(false);
    } else {
      // Reached end, show review screen
      setShowReviewScreen(true);
    }
  };

  const handleNext = () => {
    // Update question status as answered
    const newStatuses = new Map(questionStatuses);
    newStatuses.set(currentQuestion, 'answered');
    setQuestionStatuses(newStatuses);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswers([]);
      setShowResult(false);
    } else {
      // Reached end, show review screen
      setShowReviewScreen(true);
    }
  };

  const completeTest = (timeExpired: boolean = false) => {
    setGameComplete(true);
    setIsTimerActive(false);
    setShowReviewScreen(false);
    
    if (timeExpired) {
      toast.error("Time's up! Quiz completed automatically.");
    }
    
    // Calculate final results
    const endTime = new Date();
    const timeTaken = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0;
    const totalTime = questions.length * 90;
    const finalTimeRemaining = Math.max(0, timeRemaining);
    
    // Calculate score based only on answered questions
    const answeredQuestionsCount = userAnswers.length;
    const percentage = answeredQuestionsCount > 0 ? Math.round((score / answeredQuestionsCount) * 100) : 0;
    
    // Create test result with proper quiz set ID and tenant info
    const testResult: Omit<TestResult, 'id'> & { quizSetId?: string } = {
      userId: currentUser.id,
      tenantId: currentUser.tenantId,
      userName: currentUser.name,
      userEmail: currentUser.email,
      score,
      totalQuestions: answeredQuestionsCount, // Only count answered questions
      percentage,
      timeRemaining: finalTimeRemaining,
      timeTaken: totalTime - finalTimeRemaining,
      completedAt: new Date().toISOString(),
      quizType: quizId ? 'custom' : 'default',
      quizSetId: quizId, // Pass the actual quiz set ID
      questionsUsed: questions,
      answers: userAnswers
    };
    
    // Save result
    const savedResult = dataService.saveTestResult(testResult);
    
    // Notify parent component
    onTestComplete(savedResult);
  };

  const handleGoToQuestion = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
    setShowReviewScreen(false);
    setShowResult(false);
    
    // Check if this question was previously answered
    const previousAnswer = userAnswers.find(answer => answer.questionIndex === questionIndex);
    if (previousAnswer) {
      setSelectedAnswers(previousAnswer.selectedAnswers);
    } else {
      setSelectedAnswers([]);
    }
    
    // Remove from skipped questions if it was skipped
    const newSkipped = new Set(skippedQuestions);
    newSkipped.delete(questionIndex);
    setSkippedQuestions(newSkipped);
    
    // Update question status to unanswered since we're going back to it
    const newStatuses = new Map(questionStatuses);
    if (!previousAnswer) {
      newStatuses.set(questionIndex, 'unanswered');
      setQuestionStatuses(newStatuses);
    }
  };

  const handleFinalSubmission = () => {
    completeTest(false);
  };

  const resetGame = () => {
    initializeTest();
  };

  // Helper function to format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to determine timer color based on remaining time
  const getTimerColorClass = (): string => {
    const totalTime = questions.length * 90;
    const percentRemaining = (timeRemaining / totalTime) * 100;
    
    if (percentRemaining <= 10) return 'text-danger';
    if (percentRemaining <= 25) return 'text-warning';
    if (percentRemaining <= 50) return 'text-info';
    return 'text-success';
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">Loading quiz...</p>
            <Button onClick={onBackToDashboard} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show review screen before final submission
  if (showReviewScreen) {
    const answeredCount = userAnswers.length;
    const skippedCount = skippedQuestions.size;
    const totalCount = questions.length;

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-white shadow-modern">
          <div className="container mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToDashboard}
                  className="text-primary hover:bg-primary/10 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div className="w-px h-6 bg-border"></div>
                <h1 className="text-xl font-semibold text-foreground">Review Your Answers</h1>
              </div>
              <Badge className="gradient-primary text-white px-4 py-2 rounded-lg font-medium">{currentUser.name}</Badge>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Timer and Progress */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-primary text-primary">
                  Review Mode
                </Badge>
                <div className={`flex items-center gap-2 ${getTimerColorClass()}`}>
                  <Clock className="w-5 h-5" />
                  <span className="text-lg font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-success/20 bg-gradient-to-br from-green-50 to-emerald-50 hover-lift shadow-modern">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-success mb-2">{answeredCount}</div>
                  <div className="text-sm font-medium text-success/80">Answered</div>
                </CardContent>
              </Card>
              <Card className="border-warning/20 bg-gradient-to-br from-orange-50 to-amber-50 hover-lift shadow-modern">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-warning mb-2">{skippedCount}</div>
                  <div className="text-sm font-medium text-warning/80">Skipped</div>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-gradient-to-br from-indigo-50 to-purple-50 hover-lift shadow-modern">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">{totalCount}</div>
                  <div className="text-sm font-medium text-primary/80">Total</div>
                </CardContent>
              </Card>
            </div>

            {/* Question List */}
            <Card className="border-border shadow-modern-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
                <CardTitle className="text-primary text-lg">Question Summary</CardTitle>
                {skippedCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Click on any skipped question to go back and answer it
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-3">
                  {questions.map((question, index) => {
                    const status = questionStatuses.get(index) || 'unanswered';
                    const isSkipped = skippedQuestions.has(index);
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover-lift ${
                          status === 'answered'
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-success/30'
                            : status === 'skipped'
                            ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-warning/30'
                            : 'bg-gradient-to-r from-slate-50 to-gray-50 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`font-semibold px-3 py-1 rounded-lg ${
                              status === 'answered'
                                ? 'bg-success text-white shadow-lg'
                                : status === 'skipped'
                                ? 'bg-warning text-white shadow-lg'
                                : 'bg-secondary text-white shadow-lg'
                            }`}
                          >
                            Q{index + 1}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium line-clamp-2">
                              {question.question}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {status === 'answered' && (
                            <CheckCircle className="w-5 h-5 text-success" />
                          )}
                          {status === 'skipped' && (
                            <>
                              <span className="text-sm text-warning font-medium">Skipped</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGoToQuestion(index)}
                                className="border-warning text-warning hover:bg-warning hover:text-white rounded-lg font-medium transition-all hover-lift"
                              >
                                Answer Now
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Final Submission */}
            <Card className="border-primary/30 shadow-modern-lg bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="text-center py-8">
                {skippedCount > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      <span className="text-warning font-medium">
                        You have {skippedCount} unanswered question{skippedCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You can go back and answer skipped questions, or submit your current answers.
                      Skipped questions will not count towards your score.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={handleFinalSubmission}
                        className="gradient-primary hover:shadow-lg text-white px-8 py-3 rounded-xl font-semibold transition-all hover-lift"
                      >
                        Submit Current Answers
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="text-success font-medium">
                        All questions answered!
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Great job! You've answered all {totalCount} questions.
                    </p>
                    <Button
                      onClick={handleFinalSubmission}
                      className="gradient-success hover:shadow-lg text-white px-8 py-3 rounded-xl font-semibold transition-all hover-lift"
                    >
                      Submit Quiz
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (gameComplete) {
    const scorePercentage = userAnswers.length > 0 ? (score / userAnswers.length) * 100 : 0;
    let resultColor = '';
    let resultIcon = '';
    
    if (timeRemaining === 0) {
      resultColor = 'text-warning';
      resultIcon = '⏰';
    } else if (scorePercentage === 100) {
      resultColor = 'text-success';
      resultIcon = '🎉';
    } else if (scorePercentage >= 70) {
      resultColor = 'text-info';
      resultIcon = '👏';
    } else {
      resultColor = 'text-secondary';
      resultIcon = '📚';
    }

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-white shadow-modern">
          <div className="container mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToDashboard}
                  className="text-primary hover:bg-primary/10 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div className="w-px h-6 bg-border"></div>
                <h1 className="text-xl font-semibold text-foreground">Test Complete</h1>
              </div>
              <Badge className="gradient-primary text-white px-4 py-2 rounded-lg font-medium">{currentUser.name}</Badge>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          <Card className="max-w-3xl mx-auto border-primary/30 shadow-modern-lg bg-gradient-to-br from-white to-indigo-50">
            <CardHeader className="text-center bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-primary/20 py-8">
              <CardTitle className="text-primary text-2xl">🎉 Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6 py-8">
              <div className="text-6xl mb-4">
                {resultIcon}
              </div>
              <h3 className={`text-2xl ${resultColor}`}>Your Score: {score} out of {userAnswers.length} answered</h3>
              {skippedQuestions.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  ({skippedQuestions.size} question{skippedQuestions.size !== 1 ? 's' : ''} skipped)
                </p>
              )}
              
              {/* Time completion info */}
              <div className="bg-light rounded-lg p-4 border border-secondary">
                {timeRemaining === 0 ? (
                  <p className="text-warning">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time expired! Quiz completed automatically.
                  </p>
                ) : (
                  <p className="text-success">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Completed with {formatTime(timeRemaining)} remaining
                  </p>
                )}
              </div>
              
              <div className={`p-4 rounded-lg ${
                scorePercentage === 100 ? 'bg-success text-white' :
                scorePercentage >= 70 ? 'bg-info text-white' :
                'bg-secondary text-white'
              }`}>
                <p>
                  {timeRemaining === 0 
                    ? "Good effort! Try again with better time management."
                    : score === userAnswers.length 
                    ? "Perfect! You're an AWS expert!" 
                    : userAnswers.length > 0 && score >= userAnswers.length * 0.7 
                    ? "Great job! You know your AWS services well." 
                    : "Good effort! Keep learning about AWS services."}
                </p>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button onClick={resetGame} className="bg-primary hover:bg-primary/90 text-white px-6">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={onBackToDashboard} 
                  variant="outline"
                  className="border-secondary text-secondary hover:bg-secondary hover:text-white px-6"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuizQuestion = questions[currentQuestion];
  const correctAnswers = Array.isArray(currentQuizQuestion.correct_answer) 
    ? currentQuizQuestion.correct_answer 
    : [currentQuizQuestion.correct_answer];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white shadow-modern">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToDashboard}
                className="text-primary hover:bg-primary/10 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="w-px h-6 bg-border"></div>
              <h1 className="text-xl font-semibold text-foreground">AWS Knowledge Quiz</h1>
            </div>
            <Badge className="gradient-primary text-white px-4 py-2 rounded-lg font-medium">{currentUser.name}</Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress, Score, and Timer */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-primary text-primary">
                Question {currentQuestion + 1} of {questions.length}
              </Badge>
              <Badge className="bg-success text-white">
                Score: {score}
              </Badge>
              <Badge className="bg-info text-white">
                Answered: {userAnswers.length}
              </Badge>
              {skippedQuestions.size > 0 && (
                <Badge className="bg-warning text-white">
                  Skipped: {skippedQuestions.size}
                </Badge>
              )}
              <Badge className={currentQuizQuestion.choice_type === "multiplechoice" ? "bg-info text-white" : "bg-secondary text-white"}>
                {currentQuizQuestion.choice_type === "multiplechoice" ? "Multiple Choice" : "Single Choice"}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              {/* Timer Display */}
              <div className={`flex items-center gap-2 ${getTimerColorClass()}`}>
                <Clock className="w-5 h-5" />
                <span className="text-lg font-mono font-bold">
                  {formatTime(timeRemaining)}
                </span>
                {showResult && (
                  <Badge variant="outline" className="text-xs ml-2 border-warning text-warning">
                    PAUSED
                  </Badge>
                )}
                {timeRemaining <= 30 && timeRemaining > 0 && !showResult && (
                  <AlertTriangle className="w-4 h-4 text-danger animate-pulse" />
                )}
              </div>
              <Progress 
                value={(currentQuestion / questions.length) * 100} 
                className="w-32"
              />
            </div>
          </div>

          {/* Question Progress Indicator */}
          <Card className="border-primary/20 shadow-modern bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-info" />
                  <span className="text-muted-foreground">
                    Total Time: {Math.floor((questions.length * 90) / 60)}:{((questions.length * 90) % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <span className="text-muted-foreground">90 seconds per question</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {questions.map((_, index) => {
                  const status = questionStatuses.get(index) || 'unanswered';
                  const isSkipped = skippedQuestions.has(index);
                  const isCurrent = index === currentQuestion;
                  const hasAnswer = userAnswers.some(answer => answer.questionIndex === index);
                  
                  return (
                    <div
                      key={index}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all hover-lift shadow-modern ${
                        isCurrent
                          ? 'border-primary bg-primary text-white shadow-lg'
                          : hasAnswer
                          ? 'border-success bg-success text-white shadow-lg'
                          : isSkipped
                          ? 'border-warning bg-warning text-white shadow-lg'
                          : 'border-secondary/50 bg-white text-secondary hover:border-primary'
                      }`}
                    >
                      {index + 1}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  <span>Skipped</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-secondary/20 border border-secondary"></div>
                  <span>Not attempted</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Game Card */}
          <Card className="border-primary/30 shadow-modern-lg bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-primary/20">
              <CardTitle className="text-center text-foreground text-xl">
                {currentQuizQuestion.question}
              </CardTitle>
              {currentQuizQuestion.choice_type === "multiplechoice" && (
                <p className="text-center text-sm text-primary font-medium">
                  Select all correct answers
                </p>
              )}
            </CardHeader>
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Icon Display */}
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="w-36 h-36 flex items-center justify-center p-6 bg-gradient-to-br from-white to-slate-50 border border-border rounded-2xl mb-4 shadow-modern hover-lift">
                    <ImageWithFallback
                      src={currentQuizQuestion.imageurl}
                      alt={currentQuizQuestion.imagedesc}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-muted-foreground text-center font-medium">
                    {currentQuizQuestion.imagedesc}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuizQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswers.includes(option);
                    const isCorrect = correctAnswers.includes(option);
                    const isIncorrect = showResult && isSelected && !isCorrect;
                    const shouldHighlight = showResult && isCorrect;
                    const shouldShowCorrect = showResult && isCorrect && !isSelected;

                    if (currentQuizQuestion.choice_type === "multiplechoice") {
                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all duration-300 hover-lift ${
                            isSelected && !showResult
                              ? 'border-success bg-success/10 text-success font-semibold'
                              : shouldHighlight
                              ? 'border-success bg-success text-white shadow-lg'
                              : shouldShowCorrect
                              ? 'border-success bg-gradient-to-r from-green-50 to-emerald-50 text-success'
                              : isIncorrect
                              ? 'border-danger bg-danger/10 text-danger font-semibold'
                              : 'border-border hover:border-primary hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-md text-foreground'
                          }`}
                        >
                          <Checkbox
                            id={`option-${index}`}
                            checked={isSelected}
                            onCheckedChange={() => handleMultipleAnswerToggle(option)}
                            disabled={showResult}
                            className={showResult && isCorrect ? 'border-white' : ''}
                          />
                          <label
                            htmlFor={`option-${index}`}
                            className={`flex-1 cursor-pointer ${showResult ? 'cursor-default' : ''}`}
                          >
                            {option}
                          </label>
                          {showResult && isCorrect && (
                            <CheckCircle className="w-5 h-5 text-white" />
                          )}
                          {isIncorrect && (
                            <XCircle className="w-5 h-5 text-white" />
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <button
                          key={index}
                          onClick={() => handleSingleAnswerSelect(option)}
                          disabled={showResult}
                          className={`w-full p-4 text-left border-2 rounded-xl transition-all duration-300 hover-lift ${
                            isSelected && !showResult
                              ? 'border-success bg-success/10 text-success font-semibold'
                              : shouldHighlight
                              ? 'border-success bg-success text-white shadow-lg'
                              : isIncorrect
                              ? 'border-danger bg-danger/10 text-danger font-semibold'
                              : 'border-border hover:border-primary hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-md text-foreground'
                          } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{option}</span>
                            {showResult && isCorrect && (
                              <CheckCircle className="w-5 h-5 text-white" />
                            )}
                            {isIncorrect && (
                              <XCircle className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </button>
                      );
                    }
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-8">
                {!showResult ? (
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={selectedAnswers.length === 0}
                      className="px-8 py-3 gradient-primary hover:shadow-lg text-white rounded-xl font-semibold transition-all hover-lift"
                    >
                      Submit Answer
                    </Button>
                    <Button 
                      onClick={handleSkipQuestion}
                      variant="outline"
                      className="px-8 py-3 border-warning text-warning hover:bg-gradient-warning hover:text-white rounded-xl font-semibold transition-all hover-lift"
                    >
                      Skip Question
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      {isAnswerCorrect(currentQuizQuestion, selectedAnswers) ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-success" />
                          <span className="text-success font-semibold">Correct!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-danger" />
                          <span className="text-danger font-semibold">
                            Incorrect. The correct answer{correctAnswers.length > 1 ? 's are' : ' is'}: {correctAnswers.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                    <Button 
                      onClick={handleNext} 
                      className="px-8 py-3 gradient-primary hover:shadow-lg text-white rounded-xl font-semibold transition-all hover-lift"
                    >
                      {currentQuestion < questions.length - 1 ? 'Next Question' : 'Review Answers'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}