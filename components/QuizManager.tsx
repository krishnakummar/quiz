import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Download, Upload, FileText, AlertCircle, Eye, ChevronDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Separator } from './ui/separator';

interface QuizQuestion {
  imageurl: string;
  imagedesc: string;
  question: string;
  choice_type: "radio" | "multiplechoice";
  options: string[];
  correct_answer: string | string[];
}

interface QuizManagerProps {
  questions: QuizQuestion[];
  onQuestionsUpdate: (questions: QuizQuestion[]) => void;
  isCustomQuestions: boolean;
  onToggleQuestionSource: () => void;
  showCreateForm?: boolean;
  onCreateQuiz?: (name: string, description: string, questions: QuizQuestion[]) => void;
}

export function QuizManager({ 
  questions, 
  onQuestionsUpdate, 
  isCustomQuestions, 
  onToggleQuestionSource,
  showCreateForm = false,
  onCreateQuiz
}: QuizManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuestionBrowser, setShowQuestionBrowser] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    questions: questions
  });

  const downloadJSON = () => {
    const jsonData = JSON.stringify(questions, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `aws-quiz-questions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Questions downloaded successfully!');
  };

  const validateQuestionFormat = (questions: any[]): boolean => {
    if (!Array.isArray(questions)) {
      toast.error('JSON must contain an array of questions');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.imageurl || typeof q.imageurl !== 'string') {
        toast.error(`Question ${i + 1}: Missing or invalid imageurl`);
        return false;
      }
      
      if (!q.imagedesc || typeof q.imagedesc !== 'string') {
        toast.error(`Question ${i + 1}: Missing or invalid imagedesc`);
        return false;
      }
      
      if (!q.question || typeof q.question !== 'string') {
        toast.error(`Question ${i + 1}: Missing or invalid question`);
        return false;
      }
      
      if (!q.choice_type || !['radio', 'multiplechoice'].includes(q.choice_type)) {
        toast.error(`Question ${i + 1}: choice_type must be "radio" or "multiplechoice"`);
        return false;
      }
      
      if (!Array.isArray(q.options) || q.options.length < 2) {
        toast.error(`Question ${i + 1}: options must be an array with at least 2 items`);
        return false;
      }
      
      if (!q.correct_answer) {
        toast.error(`Question ${i + 1}: Missing correct_answer`);
        return false;
      }
      
      // Validate correct_answer format
      if (q.choice_type === 'multiplechoice') {
        if (!Array.isArray(q.correct_answer)) {
          toast.error(`Question ${i + 1}: multiplechoice questions require correct_answer to be an array`);
          return false;
        }
        
        // Check if all correct answers exist in options
        for (const answer of q.correct_answer) {
          if (!q.options.includes(answer)) {
            toast.error(`Question ${i + 1}: correct_answer "${answer}" not found in options`);
            return false;
          }
        }
      } else {
        if (typeof q.correct_answer !== 'string') {
          toast.error(`Question ${i + 1}: radio questions require correct_answer to be a string`);
          return false;
        }
        
        if (!q.options.includes(q.correct_answer)) {
          toast.error(`Question ${i + 1}: correct_answer "${q.correct_answer}" not found in options`);
          return false;
        }
      }
    }
    
    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const parsedQuestions = JSON.parse(jsonContent);
        
        if (validateQuestionFormat(parsedQuestions)) {
          onQuestionsUpdate(parsedQuestions);
          setCreateFormData(prev => ({ ...prev, questions: parsedQuestions }));
          toast.success(`Successfully loaded ${parsedQuestions.length} questions! All questions will be used in the quiz.`);
          setShowQuestionBrowser(true); // Auto-expand to show loaded questions
        }
      } catch (error) {
        toast.error('Invalid JSON format. Please check your file.');
      }
    };
    
    reader.readAsText(file);
    
    // Reset the input value so the same file can be uploaded again
    event.target.value = '';
  };

  const handleCreateQuiz = () => {
    if (!createFormData.name.trim()) {
      toast.error('Please enter a quiz name');
      return;
    }
    if (!createFormData.description.trim()) {
      toast.error('Please enter a quiz description');
      return;
    }
    if (createFormData.questions.length === 0) {
      toast.error('Please upload questions for the quiz');
      return;
    }

    if (onCreateQuiz) {
      onCreateQuiz(createFormData.name, createFormData.description, createFormData.questions);
      setCreateFormData({ name: '', description: '', questions: [] });
    }
  };

  if (showCreateForm) {
    return (
      <Card className="border-secondary shadow-lg">
        <CardHeader className="bg-light border-b border-secondary">
          <CardTitle className="text-lg text-primary">Create New Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="quiz-name">Quiz Name</Label>
            <Input
              id="quiz-name"
              placeholder="Enter quiz name"
              value={createFormData.name}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
              className="border-secondary focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quiz-description">Description</Label>
            <Textarea
              id="quiz-description"
              placeholder="Enter quiz description"
              value={createFormData.description}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
              className="border-secondary focus:border-primary min-h-20"
            />
          </div>

          <div className="space-y-4">
            <Label>Questions ({createFormData.questions.length} loaded)</Label>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="file-upload-create" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary hover:text-white">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Questions JSON
                  </span>
                </Button>
              </Label>
              <Input
                id="file-upload-create"
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {createFormData.questions.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowQuestionBrowser(!showQuestionBrowser)}
                  className="border-info text-info hover:bg-info hover:text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showQuestionBrowser ? 'Hide' : 'Preview'} Questions
                </Button>
              )}
            </div>

            {createFormData.questions.length > 0 && (
              <div className="p-3 bg-success/10 border border-success rounded-lg">
                <p className="text-sm text-success font-medium">
                  ✓ {createFormData.questions.length} questions loaded successfully
                </p>
              </div>
            )}
          </div>

          {showQuestionBrowser && createFormData.questions.length > 0 && (
            <>
              <Separator className="bg-secondary" />
              <div className="space-y-4">
                <h4 className="font-medium text-primary">Questions Preview</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {createFormData.questions.slice(0, 5).map((question, index) => {
                    const correctAnswers = Array.isArray(question.correct_answer) 
                      ? question.correct_answer 
                      : [question.correct_answer];

                    return (
                      <div key={index} className="p-3 bg-light border border-secondary rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Q{index + 1}
                          </Badge>
                          <Badge 
                            className={`text-xs ${
                              question.choice_type === "multiplechoice" 
                                ? "bg-info text-white" 
                                : "bg-secondary text-white"
                            }`}
                          >
                            {question.choice_type === "multiplechoice" ? "Multi" : "Single"}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{question.question}</p>
                        <p className="text-xs text-muted-foreground">
                          Correct: <span className="text-success font-medium">{correctAnswers.join(", ")}</span>
                        </p>
                      </div>
                    );
                  })}
                  {createFormData.questions.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ... and {createFormData.questions.length - 5} more questions
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleCreateQuiz}
              disabled={!createFormData.name || !createFormData.description || createFormData.questions.length === 0}
              className="bg-success hover:bg-success/90 text-white"
            >
              Create Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-secondary shadow-lg">
      <CardHeader className="bg-light border-b border-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg text-primary">Question Management</CardTitle>
            <Badge className={isCustomQuestions ? "bg-primary text-white" : "bg-secondary text-white"}>
              {isCustomQuestions ? 'Custom Questions' : 'Default Questions'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary hover:bg-primary/10"
          >
            {isExpanded ? 'Hide' : 'Show'} Tools
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary hover:text-white">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload JSON
                  </span>
                </Button>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={downloadJSON} className="border-success text-success hover:bg-success hover:text-white">
              <Download className="w-4 h-4 mr-2" />
              Download JSON
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowQuestionBrowser(!showQuestionBrowser)}
              className="border-info text-info hover:bg-info hover:text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showQuestionBrowser ? 'Hide' : 'Preview'} Questions
            </Button>
            
            {isCustomQuestions && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onToggleQuestionSource}
                className="text-secondary hover:bg-secondary/10"
              >
                Switch to Default Questions
              </Button>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 text-warning flex-shrink-0" />
              <div>
                <p className="text-dark">Upload a JSON file with quiz questions to use custom content. <strong>All questions from the uploaded file will be used in the quiz.</strong></p>
                <p className="text-dark mt-1">Each question should have: imageurl, imagedesc, question, choice_type ("radio" or "multiplechoice"), options array, and correct_answer.</p>
              </div>
            </div>
          </div>
          
          <div className="text-sm">
            <p className="text-muted-foreground mb-2">Current question set contains:</p>
            <div className="flex gap-4">
              <Badge className="bg-info text-white">{questions.length} total questions</Badge>
              <Badge className="bg-primary text-white">
                {questions.filter(q => q.choice_type === 'radio').length} single-choice
              </Badge>
              <Badge className="bg-secondary text-white">
                {questions.filter(q => q.choice_type === 'multiplechoice').length} multiple-choice
              </Badge>
            </div>
          </div>

          {showQuestionBrowser && questions.length > 0 && (
            <>
              <Separator className="bg-secondary" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-primary">
                    {isCustomQuestions ? "Uploaded Questions Preview" : "Default Questions Preview"}
                  </h4>
                  <Badge className="bg-success text-white">{questions.length} questions</Badge>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {questions.map((question, index) => {
                    const correctAnswers = Array.isArray(question.correct_answer) 
                      ? question.correct_answer 
                      : [question.correct_answer];

                    return (
                      <Collapsible key={index}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-between p-3 h-auto text-left border-2 border-secondary rounded-lg hover:bg-light hover:border-primary"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className="w-10 h-10 flex items-center justify-center bg-light border border-secondary rounded-md flex-shrink-0">
                                <ImageWithFallback
                                  src={question.imageurl}
                                  alt={question.imagedesc}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs border-primary text-primary">
                                    Q{index + 1}
                                  </Badge>
                                  <Badge 
                                    className={`text-xs ${
                                      question.choice_type === "multiplechoice" 
                                        ? "bg-info text-white" 
                                        : "bg-secondary text-white"
                                    }`}
                                  >
                                    {question.choice_type === "multiplechoice" ? "Multi" : "Single"}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium line-clamp-2">
                                  {question.question}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className="w-4 h-4 flex-shrink-0 text-primary" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm text-primary">Options:</h5>
                              <div className="space-y-1">
                                {question.options.map((option, optionIndex) => (
                                  <div 
                                    key={optionIndex}
                                    className={`text-sm p-2 rounded border-2 ${
                                      correctAnswers.includes(option)
                                        ? 'bg-success border-success text-white'
                                        : 'bg-light border-secondary'
                                    }`}
                                  >
                                    {correctAnswers.includes(option) && <span className="font-medium">✓ </span>}
                                    {option}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h5 className="font-medium text-sm text-primary">Details:</h5>
                              <div className="text-sm space-y-1 p-3 bg-light border border-secondary rounded">
                                <p><strong className="text-dark">Image:</strong> {question.imagedesc}</p>
                                <p><strong className="text-dark">Type:</strong> {question.choice_type === "multiplechoice" ? "Multiple Choice" : "Single Choice"}</p>
                                <p><strong className="text-dark">Correct Answer(s):</strong> <span className="text-success font-semibold">{correctAnswers.join(", ")}</span></p>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}