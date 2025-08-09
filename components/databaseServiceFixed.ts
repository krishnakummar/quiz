import { User, TestResult, QuizSet, QuizQuestion, AppState, Tenant } from './types';

// In-memory relational database using localStorage with multi-tenancy support
interface DatabaseTable<T> {
  [key: string]: T;
}

interface DatabaseSchema {
  tenants: DatabaseTable<TenantRecord>;
  users: DatabaseTable<UserRecord>;
  quiz_sets: DatabaseTable<QuizSetRecord>;
  quiz_questions: DatabaseTable<QuizQuestionRecord>;
  user_attempts: DatabaseTable<UserAttemptRecord>;
  attempt_answers: DatabaseTable<AttemptAnswerRecord>;
  user_sessions: DatabaseTable<UserSessionRecord>;
  metadata: DatabaseTable<MetadataRecord>;
}

interface TenantRecord {
  id: string;
  name: string;
  description: string;
  domain?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  settings_json: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'product-admin' | 'admin' | 'user';
  tenant_id?: string;
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
}

interface QuizSetRecord {
  id: string;
  name: string;
  description: string;
  is_published: boolean;
  tenant_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface QuizQuestionRecord {
  id: string;
  quiz_set_id: string;
  image_url: string;
  image_desc: string;
  question: string;
  choice_type: 'radio' | 'multiplechoice';
  options_json: string;
  correct_answer_json: string;
  order_index: number;
}

interface UserAttemptRecord {
  id: string;
  user_id: string;
  tenant_id?: string;
  quiz_set_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_remaining: number;
  time_taken: number;
  completed_at: string;
  quiz_type: string;
}

interface AttemptAnswerRecord {
  id: string;
  attempt_id: string;
  question_id: string;
  user_answer_json: string;
  is_correct: boolean;
}

interface UserSessionRecord {
  id: string;
  user_id: string;
}

interface MetadataRecord {
  version: string;
  last_updated: string;
}

class LocalDatabaseService {
  private static instance: LocalDatabaseService;
  private db: DatabaseSchema;
  private readonly DB_KEY = 'awsQuizMultiTenantDB';
  private readonly DB_VERSION = '2.2.0'; // Updated for tenant approval workflow and business email validation

  private constructor() {
    this.db = this.loadDatabase();
  }

  public static getInstance(): LocalDatabaseService {
    if (!LocalDatabaseService.instance) {
      LocalDatabaseService.instance = new LocalDatabaseService();
    }
    return LocalDatabaseService.instance;
  }

  // Initialize database and create tables
  public async initializeDatabase(): Promise<void> {
    try {
      // Check if database exists and is current version
      const existingData = localStorage.getItem(this.DB_KEY);
      
      if (!existingData) {
        // Create new database
        this.createEmptyDatabase();
        await this.seedDefaultData();
      } else {
        // Load existing database
        this.db = JSON.parse(existingData);
        
        // Check version and migrate if needed
        const metadata = Object.values(this.db.metadata)[0];
        if (!metadata || metadata.version !== this.DB_VERSION) {
          console.log('Database version mismatch, reinitializing...');
          this.createEmptyDatabase();
          await this.seedDefaultData();
        }
      }
      
      this.saveDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Fallback: create fresh database
      this.createEmptyDatabase();
      await this.seedDefaultData();
    }
  }

  private createEmptyDatabase(): void {
    this.db = {
      tenants: {},
      users: {},
      quiz_sets: {},
      quiz_questions: {},
      user_attempts: {},
      attempt_answers: {},
      user_sessions: {},
      metadata: {
        'main': {
          version: this.DB_VERSION,
          last_updated: new Date().toISOString()
        }
      }
    };
  }

  private loadDatabase(): DatabaseSchema {
    try {
      const data = localStorage.getItem(this.DB_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load database from localStorage:', error);
    }
    
    // Return empty database structure if loading fails
    return {
      tenants: {},
      users: {},
      quiz_sets: {},
      quiz_questions: {},
      user_attempts: {},
      attempt_answers: {},
      user_sessions: {},
      metadata: {}
    };
  }

  private saveDatabase(): void {
    try {
      // Update metadata
      this.db.metadata['main'] = {
        version: this.DB_VERSION,
        last_updated: new Date().toISOString()
      };
      
      localStorage.setItem(this.DB_KEY, JSON.stringify(this.db));
    } catch (error) {
      console.error('Failed to save database to localStorage:', error);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Simple password hashing (for demo purposes - in production, use bcrypt or similar)
  private hashPassword(password: string): string {
    // Simple hash function for demo - in production use proper bcrypt
    let hash = 0;
    const salt = 'awsquiz2024'; // Simple salt
    const combined = password + salt;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  // Verify password against hash
  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  // Seed default data
  private async seedDefaultData(): Promise<void> {
    // Check if data already exists
    if (Object.keys(this.db.users).length > 0) {
      return; // Data already seeded
    }

    // Create default product admin only
    const productAdminId = this.generateId();
    this.db.users[productAdminId] = {
      id: productAdminId,
      name: 'Product Administrator',
      email: 'product.admin@aws-quiz.demo',
      password_hash: this.hashPassword('wel123'),
      role: 'product-admin',
      status: 'active',
      created_at: new Date().toISOString()
    };

    // Create a demo approved tenant with sample data for demonstration
    const demoTenantId = this.generateId();
    this.db.tenants[demoTenantId] = {
      id: demoTenantId,
      name: 'Demo Organization',
      description: 'Sample organization for demonstration purposes',
      status: 'approved',
      is_active: true,
      created_by: 'demo.admin@demo.com',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
      approved_by: productAdminId,
      approved_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      settings_json: JSON.stringify({
        allowUserRegistration: true,
        maxAdmins: 5,
        maxUsers: 100,
        maxQuizzes: 50
      })
    };

    // Create demo admin for the approved tenant
    const demoAdminId = this.generateId();
    this.db.users[demoAdminId] = {
      id: demoAdminId,
      name: 'Demo Admin',
      email: 'demo.admin@demo.com',
      password_hash: this.hashPassword('wel123'),
      role: 'admin',
      tenant_id: demoTenantId,
      status: 'active',
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Create some demo students for the approved tenant
    const demoStudents = [
      { name: 'Alice Johnson', email: 'alice.johnson@demo.com' },
      { name: 'Bob Smith', email: 'bob.smith@demo.com' },
      { name: 'Carol Davis', email: 'carol.davis@demo.com' }
    ];

    const studentIds: string[] = [];
    for (const student of demoStudents) {
      const studentId = this.generateId();
      studentIds.push(studentId);
      this.db.users[studentId] = {
        id: studentId,
        name: student.name,
        email: student.email,
        password_hash: this.hashPassword('wel123'),
        role: 'user',
        tenant_id: demoTenantId,
        status: 'active',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    // Create a sample published quiz for the demo tenant
    const defaultQuizQuestions: any[] = [
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-EC2-Auto-Scaling_64.svg",
        imagedesc: "Amazon EC2 Auto Scaling icon",
        question: "Auto Scaling automatically adjusts the number of EC2 instances based on demand",
        choice_type: "radio",
        options: ["True", "False"],
        correct_answer: "True"
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-S3_64.svg",
        imagedesc: "Amazon S3 icon",
        question: "What type of storage does Amazon S3 provide?",
        choice_type: "radio",
        options: ["Block Storage", "Object Storage", "File Storage"],
        correct_answer: "Object Storage"
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-RDS_64.svg",
        imagedesc: "Amazon RDS icon", 
        question: "Which database engines are supported by Amazon RDS? (Select all that apply)",
        choice_type: "multiplechoice",
        options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle", "SQL Server", "Redis"],
        correct_answer: ["MySQL", "PostgreSQL", "Oracle", "SQL Server"]
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_AWS-Lambda_64.svg",
        imagedesc: "AWS Lambda icon",
        question: "Lambda is a serverless compute service",
        choice_type: "radio", 
        options: ["True", "False"],
        correct_answer: "True"
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-DynamoDB_64.svg",
        imagedesc: "Amazon DynamoDB icon",
        question: "DynamoDB is what type of database?",
        choice_type: "radio",
        options: ["Relational database", "NoSQL database", "Graph database"],
        correct_answer: "NoSQL database"
      }
    ];

    // Create demo quiz set
    const demoQuizSetId = this.generateId();
    this.db.quiz_sets[demoQuizSetId] = {
      id: demoQuizSetId,
      name: 'AWS Services Fundamentals',
      description: 'Essential AWS services knowledge test covering EC2, S3, Lambda, and more',
      is_published: true,
      tenant_id: demoTenantId,
      created_by: demoAdminId,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Insert demo quiz questions
    for (let i = 0; i < defaultQuizQuestions.length; i++) {
      const question = defaultQuizQuestions[i];
      const questionId = this.generateId();
      
      this.db.quiz_questions[questionId] = {
        id: questionId,
        quiz_set_id: demoQuizSetId,
        image_url: question.imageurl,
        image_desc: question.imagedesc,
        question: question.question,
        choice_type: question.choice_type,
        options_json: JSON.stringify(question.options),
        correct_answer_json: JSON.stringify(question.correct_answer),
        order_index: i
      };
    }

    // Generate some sample test results for the demo students
    const sampleResults = [
      { studentIndex: 0, score: 4, percentage: 80, daysAgo: 2 },
      { studentIndex: 1, score: 3, percentage: 60, daysAgo: 1 },
      { studentIndex: 2, score: 5, percentage: 100, daysAgo: 0.125 } // 3 hours ago
    ];

    for (const result of sampleResults) {
      const attemptId = this.generateId();
      const completedAt = new Date(Date.now() - result.daysAgo * 24 * 60 * 60 * 1000).toISOString();
      
      this.db.user_attempts[attemptId] = {
        id: attemptId,
        user_id: studentIds[result.studentIndex],
        tenant_id: demoTenantId,
        quiz_set_id: demoQuizSetId,
        score: result.score,
        total_questions: 5,
        percentage: result.percentage,
        time_remaining: result.percentage >= 80 ? 120 : 45, // time remaining
        time_taken: 450 - (result.percentage >= 80 ? 120 : 45), // time taken
        completed_at: completedAt,
        quiz_type: 'custom'
      };
    }

    // Add some pending tenant approval requests for demonstration
    const pendingTenantRequests = [
      {
        tenantName: 'TechCorp Solutions',
        description: 'Technology consulting company specializing in cloud migrations',
        adminName: 'Sarah Wilson',
        adminEmail: 'sarah.wilson@techcorp.business',
        hoursAgo: 4
      },
      {
        tenantName: 'StartupXYZ Inc.',
        description: 'Innovative startup working on AI-powered solutions',
        adminName: 'Mike Chen',
        adminEmail: 'mike.chen@startupxyz.company',
        hoursAgo: 12
      }
    ];

    for (const request of pendingTenantRequests) {
      // Create pending tenant
      const tenantId = this.generateId();
      this.db.tenants[tenantId] = {
        id: tenantId,
        name: request.tenantName,
        description: request.description,
        status: 'pending',
        is_active: false,
        created_by: request.adminEmail,
        created_at: new Date(Date.now() - request.hoursAgo * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - request.hoursAgo * 60 * 60 * 1000).toISOString(),
        settings_json: JSON.stringify({
          allowUserRegistration: true,
          maxAdmins: 5,
          maxUsers: 100,
          maxQuizzes: 50
        })
      };

      // Create pending admin user for the tenant
      const adminId = this.generateId();
      this.db.users[adminId] = {
        id: adminId,
        name: request.adminName,
        email: request.adminEmail,
        password_hash: this.hashPassword('wel123'),
        role: 'admin',
        tenant_id: tenantId,
        status: 'pending',
        created_at: new Date(Date.now() - request.hoursAgo * 60 * 60 * 1000).toISOString()
      };
    }

    this.saveDatabase();
  }

  // ===== TENANT MANAGEMENT =====

  public createTenant(tenant: Tenant): Tenant {
    this.db.tenants[tenant.id] = {
      id: tenant.id,
      name: tenant.name,
      description: tenant.description,
      domain: tenant.domain,
      status: tenant.status,
      is_active: tenant.isActive,
      created_by: tenant.createdBy,
      created_at: tenant.createdAt,
      updated_at: tenant.updatedAt,
      approved_by: tenant.approvedBy,
      approved_at: tenant.approvedAt,
      rejection_reason: tenant.rejectionReason,
      settings_json: JSON.stringify(tenant.settings)
    };

    this.saveDatabase();
    return tenant;
  }

  public updateTenant(id: string, updates: Partial<Tenant>): Tenant | null {
    const existingTenant = this.db.tenants[id];
    if (!existingTenant) {
      return null;
    }

    if (updates.name !== undefined) {
      existingTenant.name = updates.name;
    }
    if (updates.description !== undefined) {
      existingTenant.description = updates.description;
    }
    if (updates.domain !== undefined) {
      existingTenant.domain = updates.domain;
    }
    if (updates.isActive !== undefined) {
      existingTenant.is_active = updates.isActive;
    }
    if (updates.settings !== undefined) {
      existingTenant.settings_json = JSON.stringify(updates.settings);
    }
    if (updates.updatedAt !== undefined) {
      existingTenant.updated_at = updates.updatedAt;
    }
    if (updates.status !== undefined) {
      existingTenant.status = updates.status;
    }
    if (updates.approvedBy !== undefined) {
      existingTenant.approved_by = updates.approvedBy;
    }
    if (updates.approvedAt !== undefined) {
      existingTenant.approved_at = updates.approvedAt;
    }
    if (updates.rejectionReason !== undefined) {
      existingTenant.rejection_reason = updates.rejectionReason;
    }

    this.saveDatabase();
    return this.getTenant(id);
  }

  public deleteTenant(id: string): boolean {
    if (!this.db.tenants[id]) {
      return false;
    }

    delete this.db.tenants[id];
    this.saveDatabase();
    return true;
  }

  public getTenant(id: string): Tenant | null {
    const record = this.db.tenants[id];
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      name: record.name,
      description: record.description,
      domain: record.domain,
      status: record.status,
      isActive: record.is_active,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      approvedBy: record.approved_by,
      approvedAt: record.approved_at,
      rejectionReason: record.rejection_reason,
      settings: JSON.parse(record.settings_json)
    };
  }

  public getTenants(): Tenant[] {
    return Object.values(this.db.tenants)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map(record => ({
        id: record.id,
        name: record.name,
        description: record.description,
        domain: record.domain,
        status: record.status,
        isActive: record.is_active,
        createdBy: record.created_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        approvedBy: record.approved_by,
        approvedAt: record.approved_at,
        rejectionReason: record.rejection_reason,
        settings: JSON.parse(record.settings_json)
      }));
  }

  // ===== USER MANAGEMENT WITH TENANT SUPPORT =====

  public createUser(name: string, email: string, password: string, role: 'product-admin' | 'admin' | 'user' = 'user', tenantId?: string): User {
    // Check if user already exists
    const existingUser = Object.values(this.db.users).find(u => u.email === email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const userId = this.generateId();
    const createdAt = new Date().toISOString();

    this.db.users[userId] = {
      id: userId,
      name,
      email,
      password_hash: this.hashPassword(password),
      role,
      tenant_id: tenantId,
      status: 'active',
      created_at: createdAt
    };

    this.saveDatabase();

    return {
      id: userId,
      name,
      email,
      role,
      tenantId,
      status: 'active',
      createdAt
    };
  }

  public loginUser(email: string, password: string): User | null {
    const userRecord = Object.values(this.db.users).find(u => u.email === email);
    
    if (userRecord && this.verifyPassword(password, userRecord.password_hash)) {
      const user: User = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
        tenantId: userRecord.tenant_id,
        status: userRecord.status,
        createdAt: userRecord.created_at
      };

      // Set current user session
      this.db.user_sessions = {}; // Clear existing sessions
      const sessionId = this.generateId();
      this.db.user_sessions[sessionId] = {
        id: sessionId,
        user_id: user.id
      };
      this.saveDatabase();

      return user;
    }

    return null;
  }

  public resetPassword(email: string, newPassword: string): boolean {
    const userRecord = Object.values(this.db.users).find(u => u.email === email);
    
    if (userRecord) {
      userRecord.password_hash = this.hashPassword(newPassword);
      this.saveDatabase();
      return true;
    }
    
    return false;
  }

  public logoutUser(): void {
    this.db.user_sessions = {};
    this.saveDatabase();
  }

  public getCurrentUser(): User | null {
    const session = Object.values(this.db.user_sessions)[0];
    if (session) {
      const userRecord = this.db.users[session.user_id];
      if (userRecord) {
        return {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          tenantId: userRecord.tenant_id,
          status: userRecord.status,
          createdAt: userRecord.created_at
        };
      }
    }
    return null;
  }

  public getUsers(): User[] {
    return Object.values(this.db.users)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(record => ({
        id: record.id,
        name: record.name,
        email: record.email,
        role: record.role,
        tenantId: record.tenant_id,
        status: record.status,
        createdAt: record.created_at
      }));
  }

  // ===== QUIZ SET MANAGEMENT WITH TENANT SUPPORT =====

  public createQuizSet(name: string, description: string, questions: QuizQuestion[], createdBy: string, tenantId?: string): QuizSet {
    const quizSetId = this.generateId();
    const now = new Date().toISOString();

    this.db.quiz_sets[quizSetId] = {
      id: quizSetId,
      name,
      description,
      is_published: false,
      tenant_id: tenantId,
      created_by: createdBy,
      created_at: now,
      updated_at: now
    };

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionId = this.generateId();
      
      this.db.quiz_questions[questionId] = {
        id: questionId,
        quiz_set_id: quizSetId,
        image_url: question.imageurl,
        image_desc: question.imagedesc,
        question: question.question,
        choice_type: question.choice_type,
        options_json: JSON.stringify(question.options),
        correct_answer_json: JSON.stringify(question.correct_answer),
        order_index: i
      };
    }

    this.saveDatabase();
    return this.getQuizSetById(quizSetId)!;
  }

  public updateQuizSet(id: string, updates: Partial<QuizSet>): QuizSet | null {
    const existingQuizSet = this.db.quiz_sets[id];
    if (!existingQuizSet) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    
    if (updates.name !== undefined) {
      existingQuizSet.name = updates.name;
    }
    if (updates.description !== undefined) {
      existingQuizSet.description = updates.description;
    }
    if (updates.isPublished !== undefined) {
      existingQuizSet.is_published = updates.isPublished;
    }
    
    existingQuizSet.updated_at = updatedAt;
    
    this.saveDatabase();
    return this.getQuizSetById(id);
  }

  public deleteQuizSet(id: string): boolean {
    if (!this.db.quiz_sets[id]) {
      return false;
    }

    // Delete associated questions
    Object.keys(this.db.quiz_questions).forEach(questionId => {
      if (this.db.quiz_questions[questionId].quiz_set_id === id) {
        delete this.db.quiz_questions[questionId];
      }
    });

    // Delete the quiz set
    delete this.db.quiz_sets[id];
    
    this.saveDatabase();
    return true;
  }

  public publishQuiz(id: string): boolean {
    return this.updateQuizSet(id, { isPublished: true }) !== null;
  }

  public unpublishQuiz(id: string): boolean {
    return this.updateQuizSet(id, { isPublished: false }) !== null;
  }

  private getQuizSetById(id: string): QuizSet | null {
    const quizRecord = this.db.quiz_sets[id];
    if (!quizRecord) {
      return null;
    }

    // Get questions for this quiz set
    const questionRecords = Object.values(this.db.quiz_questions)
      .filter(q => q.quiz_set_id === id)
      .sort((a, b) => a.order_index - b.order_index);

    const questions: QuizQuestion[] = questionRecords.map(record => ({
      imageurl: record.image_url,
      imagedesc: record.image_desc,
      question: record.question,
      choice_type: record.choice_type,
      options: JSON.parse(record.options_json),
      correct_answer: JSON.parse(record.correct_answer_json)
    }));

    return {
      id: quizRecord.id,
      name: quizRecord.name,
      description: quizRecord.description,
      questions,
      isPublished: quizRecord.is_published,
      tenantId: quizRecord.tenant_id,
      createdBy: quizRecord.created_by,
      createdAt: quizRecord.created_at,
      updatedAt: quizRecord.updated_at
    };
  }

  public getQuizSets(): QuizSet[] {
    return Object.values(this.db.quiz_sets)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map(record => this.getQuizSetById(record.id)!)
      .filter(Boolean);
  }

  public getPublishedQuizzes(): QuizSet[] {
    return Object.values(this.db.quiz_sets)
      .filter(record => record.is_published)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map(record => this.getQuizSetById(record.id)!)
      .filter(Boolean);
  }

  // ===== TEST RESULTS WITH TENANT SUPPORT =====

  public saveTestResult(result: Omit<TestResult, 'id'> & { quizSetId?: string }): TestResult {
    const attemptId = this.generateId();
    
    // Determine the correct quiz set ID
    let quizSetId = 'default';
    
    if (result.quizSetId) {
      quizSetId = result.quizSetId;
    } else if (result.quizType === 'default') {
      // Find the default published quiz set
      const publishedQuizzes = Object.values(this.db.quiz_sets).filter(q => q.is_published);
      if (publishedQuizzes.length > 0) {
        quizSetId = publishedQuizzes[0].id;
      }
    }
    
    this.db.user_attempts[attemptId] = {
      id: attemptId,
      user_id: result.userId,
      tenant_id: result.tenantId,
      quiz_set_id: quizSetId,
      score: result.score,
      total_questions: result.totalQuestions,
      percentage: result.percentage,
      time_remaining: result.timeRemaining,
      time_taken: result.timeTaken,
      completed_at: result.completedAt,
      quiz_type: result.quizType || 'default'
    };

    this.saveDatabase();

    const savedResult: TestResult = {
      id: attemptId,
      userId: result.userId,
      tenantId: result.tenantId,
      userName: result.userName,
      userEmail: result.userEmail,
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      timeRemaining: result.timeRemaining,
      timeTaken: result.timeTaken,
      completedAt: result.completedAt,
      quizType: result.quizType || 'default',
      questionsUsed: result.questionsUsed || [],
      answers: result.answers || []
    };

    return savedResult;
  }

  public getTestResults(): TestResult[] {
    return Object.values(this.db.user_attempts)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      .map(record => {
        const userRecord = this.db.users[record.user_id];
        return {
          id: record.id,
          userId: record.user_id,
          tenantId: record.tenant_id,
          userName: userRecord ? userRecord.name : 'Unknown User',
          userEmail: userRecord ? userRecord.email : 'unknown@example.com',
          score: record.score,
          totalQuestions: record.total_questions,
          percentage: record.percentage,
          timeRemaining: record.time_remaining,
          timeTaken: record.time_taken,
          completedAt: record.completed_at,
          quizType: record.quiz_type,
          questionsUsed: [],
          answers: []
        };
      });
  }

  public getTestResultsByUser(userId: string): TestResult[] {
    return Object.values(this.db.user_attempts)
      .filter(record => record.user_id === userId)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      .map(record => {
        const userRecord = this.db.users[record.user_id];
        return {
          id: record.id,
          userId: record.user_id,
          tenantId: record.tenant_id,
          userName: userRecord ? userRecord.name : 'Unknown User',
          userEmail: userRecord ? userRecord.email : 'unknown@example.com',
          score: record.score,
          totalQuestions: record.total_questions,
          percentage: record.percentage,
          timeRemaining: record.time_remaining,
          timeTaken: record.time_taken,
          completedAt: record.completed_at,
          quizType: record.quiz_type,
          questionsUsed: [],
          answers: []
        };
      });
  }

  public deleteTestResult(id: string): boolean {
    if (!this.db.user_attempts[id]) {
      return false;
    }
    delete this.db.user_attempts[id];
    this.saveDatabase();
    return true;
  }

  // Get total attempts count for a specific quiz set (across all users)
  public getQuizSetAttempts(quizSetId: string): number {
    return Object.values(this.db.user_attempts)
      .filter(attempt => attempt.quiz_set_id === quizSetId)
      .length;
  }

  // Get user-specific attempts for a quiz set
  public getUserQuizSetAttempts(userId: string, quizSetId: string): number {
    return Object.values(this.db.user_attempts)
      .filter(attempt => attempt.user_id === userId && attempt.quiz_set_id === quizSetId)
      .length;
  }

  // Get best score for user on a specific quiz set
  public getUserBestScoreForQuiz(userId: string, quizSetId: string): number | null {
    const userAttempts = Object.values(this.db.user_attempts)
      .filter(attempt => attempt.user_id === userId && attempt.quiz_set_id === quizSetId);
    
    if (userAttempts.length === 0) {
      return null;
    }
    
    return Math.max(...userAttempts.map(attempt => attempt.percentage));
  }

  public getTestStatistics(tenantId?: string) {
    let attempts = Object.values(this.db.user_attempts);
    
    // Filter by tenant if specified
    if (tenantId) {
      attempts = attempts.filter(attempt => attempt.tenant_id === tenantId);
    }
    
    const totalTests = attempts.length;
    
    const uniqueUserIds = [...new Set(attempts.map(a => a.user_id))];
    const uniqueUsers = uniqueUserIds.length;
    
    const averageScore = totalTests > 0 
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalTests 
      : 0;

    const scoreDistribution = {
      excellent: attempts.filter(a => a.percentage >= 90).length,
      good: attempts.filter(a => a.percentage >= 70 && a.percentage < 90).length,
      average: attempts.filter(a => a.percentage >= 50 && a.percentage < 70).length,
      poor: attempts.filter(a => a.percentage < 50).length
    };

    return {
      totalTests,
      uniqueUsers,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreDistribution
    };
  }

  // Reset demo data
  public resetDemoData(): void {
    this.createEmptyDatabase();
    this.seedDefaultData();
    this.saveDatabase();
  }

  // Export database as JSON string
  public exportDatabase(): string {
    return JSON.stringify(this.db);
  }

  // Import database from binary data
  public importDatabase(data: Uint8Array): boolean {
    try {
      const jsonString = new TextDecoder().decode(data);
      const importedDb = JSON.parse(jsonString);
      
      // Basic validation
      if (!importedDb.metadata || !importedDb.users || !importedDb.tenants) {
        throw new Error('Invalid database format');
      }
      
      this.db = importedDb;
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to import database:', error);
      return false;
    }
  }

  // Migration method to convert localStorage data to database
  public async migrateFromLocalStorage(): Promise<boolean> {
    try {
      const localStorageData = localStorage.getItem('awsQuizAppState');
      if (!localStorageData) {
        return false; // No data to migrate
      }

      const appState: any = JSON.parse(localStorageData);
      
      // Clear existing database data
      this.createEmptyDatabase();

      // Create a default tenant for migration
      const migrationTenantId = this.generateId();
      this.db.tenants[migrationTenantId] = {
        id: migrationTenantId,
        name: 'Migrated Data',
        description: 'Data migrated from previous version',
        status: 'approved',
        is_active: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings_json: JSON.stringify({
          allowUserRegistration: true,
          maxAdmins: 5,
          maxUsers: 100,
          maxQuizzes: 50
        })
      };

      // Migrate users - convert 'admin' role and add tenant
      for (const user of appState.users || []) {
        this.db.users[user.id] = {
          id: user.id,
          name: user.name,
          email: user.email,
          password_hash: this.hashPassword('wel123'), // Default password for migrated users
          role: user.role === 'admin' ? 'admin' : 'user',
          tenant_id: migrationTenantId,
          status: 'active',
          created_at: user.createdAt || new Date().toISOString()
        };
      }

      // Migrate quiz sets
      for (const quizSet of appState.quizSets || []) {
        this.db.quiz_sets[quizSet.id] = {
          id: quizSet.id,
          name: quizSet.name,
          description: quizSet.description,
          is_published: quizSet.isPublished,
          tenant_id: migrationTenantId,
          created_by: quizSet.createdBy,
          created_at: quizSet.createdAt,
          updated_at: quizSet.updatedAt
        };

        // Migrate questions for this quiz set
        for (let i = 0; i < quizSet.questions.length; i++) {
          const question = quizSet.questions[i];
          const questionId = this.generateId();
          
          this.db.quiz_questions[questionId] = {
            id: questionId,
            quiz_set_id: quizSet.id,
            image_url: question.imageurl,
            image_desc: question.imagedesc,
            question: question.question,
            choice_type: question.choice_type,
            options_json: JSON.stringify(question.options),
            correct_answer_json: JSON.stringify(question.correct_answer),
            order_index: i
          };
        }
      }

      // Migrate test results
      for (const result of appState.testResults || []) {
        this.db.user_attempts[result.id] = {
          id: result.id,
          user_id: result.userId,
          tenant_id: migrationTenantId,
          quiz_set_id: 'default',
          score: result.score,
          total_questions: result.totalQuestions,
          percentage: result.percentage,
          time_remaining: result.timeRemaining,
          time_taken: result.timeTaken,
          completed_at: result.completedAt,
          quiz_type: result.quizType || 'default'
        };
      }

      this.saveDatabase();
      
      // Clear old localStorage data
      localStorage.removeItem('awsQuizAppState');
      
      return true;
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
      return false;
    }
  }

  // Database health check
  public isDatabaseHealthy(): boolean {
    try {
      return !!this.db && !!this.db.metadata && !!this.db.users;
    } catch (error) {
      return false;
    }
  }

  // Create user with specific status (for tenant approval workflow)
  public createUserWithStatus(user: User, password: string): User {
    // Check if user already exists
    const existingUser = Object.values(this.db.users).find(u => u.email === user.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    this.db.users[user.id] = {
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: this.hashPassword(password),
      role: user.role,
      tenant_id: user.tenantId,
      status: user.status,
      created_at: user.createdAt
    };

    this.saveDatabase();
    return user;
  }

  // Update user status
  public updateUserStatus(userId: string, status: 'active' | 'pending' | 'suspended'): boolean {
    const userRecord = this.db.users[userId];
    if (!userRecord) {
      return false;
    }

    userRecord.status = status;
    this.saveDatabase();
    return true;
  }
}

export const databaseService = LocalDatabaseService.getInstance();