import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface QuizQuestion {
  imageurl: string;
  imagedesc: string;
  question: string;
  choice_type: "radio" | "multiplechoice";
  options: string[];
  correct_answer: string | string[];
}

interface QuestionBrowserProps {
  questions: QuizQuestion[];
  title: string;
}

export function QuestionBrowser({ questions, title }: QuestionBrowserProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">{questions.length} questions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {questions.map((question, index) => {
          const correctAnswers = Array.isArray(question.correct_answer) 
            ? question.correct_answer 
            : [question.correct_answer];

          return (
            <Collapsible key={index}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-4 h-auto text-left"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-lg flex-shrink-0">
                      <ImageWithFallback
                        src={question.imageurl}
                        alt={question.imagedesc}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Q{index + 1}
                        </Badge>
                        <Badge 
                          variant={question.choice_type === "multiplechoice" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {question.choice_type === "multiplechoice" ? "Multi" : "Single"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">
                        {question.question}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Options:</h4>
                    <div className="space-y-1">
                      {question.options.map((option, optionIndex) => (
                        <div 
                          key={optionIndex}
                          className={`text-sm p-2 rounded border ${
                            correctAnswers.includes(option)
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-muted border-border'
                          }`}
                        >
                          {correctAnswers.includes(option) && <span className="font-medium">✓ </span>}
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Details:</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Image:</strong> {question.imagedesc}</p>
                      <p><strong>Type:</strong> {question.choice_type === "multiplechoice" ? "Multiple Choice" : "Single Choice"}</p>
                      <p><strong>Correct Answer(s):</strong> {correctAnswers.join(", ")}</p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}