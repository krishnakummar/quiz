import React from 'react';
import { CheckCircle, Brain, Zap } from 'lucide-react';

interface LogoProps {
  variant?: 'default' | 'small' | 'large';
  showText?: boolean;
  className?: string;
}

export function Logo({ variant = 'default', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const textSizes = {
    small: 'text-lg',
    default: 'text-2xl',
    large: 'text-3xl'
  };

  const iconSize = {
    small: 'w-5 h-5',
    default: 'w-7 h-7',
    large: 'w-9 h-9'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[variant]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25`}>
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
        
        {/* Main Icon */}
        <div className="relative flex items-center justify-center">
          <Brain className={`${iconSize[variant]} text-white`} />
          {/* Small accent icons */}
          <CheckCircle className="absolute -top-1 -right-1 w-3 h-3 text-success bg-white rounded-full p-0.5" />
        </div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className={`${textSizes[variant]} font-bold text-foreground leading-none`}>
            <span className="text-primary">Pro</span>
            <span className="text-foreground">Quiz</span>
          </div>
          {variant === 'large' && (
            <p className="text-sm text-muted-foreground leading-none mt-1">
              Knowledge Assessment Platform
            </p>
          )}
          {variant === 'default' && (
            <p className="text-xs text-muted-foreground leading-none mt-0.5">
              Test your expertise
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Alternative minimal version for headers/navbars
export function LogoMini({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 relative flex items-center justify-center rounded-lg bg-primary shadow-sm">
        <Brain className="w-5 h-5 text-white" />
        <Zap className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-warning bg-white rounded-full p-0.5" />
      </div>
      <span className="font-semibold text-lg text-foreground">
        <span className="text-primary">Pro</span>Quiz
      </span>
    </div>
  );
}

// Icon-only version for very compact spaces
export function LogoIcon({ size = 'default', className = '' }: { size?: 'small' | 'default' | 'large', className?: string }) {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  const iconSizes = {
    small: 'w-3.5 h-3.5',
    default: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm ${className}`}>
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent"></div>
      <Brain className={`${iconSizes[size]} text-white relative z-10`} />
      <CheckCircle className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-success bg-white rounded-full p-0.5" />
    </div>
  );
}