export interface QuizQuestion {
  imageurl: string;
  imagedesc: string;
  question: string;
  choice_type: "radio" | "multiplechoice";
  options: string[];
  correct_answer: string | string[];
}

export interface Tenant {
  id: string;
  name: string;
  description: string;
  domain?: string;
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  settings: {
    allowUserRegistration: boolean;
    maxAdmins: number;
    maxUsers: number;
    maxQuizzes: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'product-admin' | 'admin' | 'user';
  tenantId?: string; // null for product-admin, required for admin/user
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

export interface TestResult {
  id: string;
  userId: string;
  tenantId?: string;
  userName: string;
  userEmail: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeRemaining: number;
  timeTaken: number; // in seconds
  completedAt: string;
  quizType: 'default' | 'custom';
  questionsUsed: QuizQuestion[];
  answers: {
    questionIndex: number;
    question: string;
    selectedAnswers: string[];
    correctAnswers: string[];
    isCorrect: boolean;
  }[];
}

export interface QuizSet {
  id: string;
  name: string;
  description: string;
  questions: QuizQuestion[];
  isPublished: boolean;
  tenantId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  testResults: TestResult[];
  quizSets: QuizSet[];
  publishedQuizzes: QuizSet[];
  tenants: Tenant[];
}

export interface SystemConfiguration {
  databaseType: 'localStorage' | 'mysql';
  mysqlConfig?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    connectionTimeout?: number;
    acquireTimeout?: number;
    timezone?: string;
  };
  isConnected: boolean;
  connectionStatus?: {
    connected: boolean;
    error?: string;
    serverVersion?: string;
    connectionTime?: number;
  };
  lastMigration?: {
    date: string;
    success: boolean;
    recordsMigrated?: number;
  };
}