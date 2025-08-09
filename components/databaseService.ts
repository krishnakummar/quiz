// This file has been completely replaced by databaseServiceFixed.ts
// All functionality has been moved to the new RDBMS implementation
// Redirect all imports to the fixed database service

export { databaseService } from './databaseServiceFixed';

// Initialize SQL.js
const initializeSQL = async () => {
  if (!SQL) {
    // Import SQL.js
    const sqlModule = await import('sql.js');
    const sqlWasm = await import('sql.js/dist/sql-wasm.wasm?url');
    
    SQL = await sqlModule.default({
      locateFile: () => sqlWasm.default
    });
  }
};

interface DatabaseRow {
  [key: string]: any;
}

class DatabaseService {
  private static instance: DatabaseService;
  
  private constructor() {}
  
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Initialize database and create tables
  public async initializeDatabase(): Promise<void> {
    try {
      await initializeSQL();
      
      // Try to load existing database from localStorage
      const savedDB = localStorage.getItem('awsQuizDatabase');
      if (savedDB) {
        const buffer = new Uint8Array(JSON.parse(savedDB));
        db = new SQL.Database(buffer);
      } else {
        db = new SQL.Database();
      }
      
      await this.createTables();
      await this.seedDefaultData();
      this.saveDatabase();
      
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Fallback: create a new database
      if (SQL) {
        db = new SQL.Database();
        await this.createTables();
        await this.seedDefaultData();
        this.saveDatabase();
      }
    }
  }

  // Create database tables
  private async createTables(): Promise<void> {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Quiz sets table
      `CREATE TABLE IF NOT EXISTS quiz_sets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_published BOOLEAN DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,
      
      // Quiz questions table
      `CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        quiz_set_id TEXT NOT NULL,
        image_url TEXT,
        image_desc TEXT,
        question TEXT NOT NULL,
        choice_type TEXT NOT NULL CHECK (choice_type IN ('radio', 'multiplechoice')),
        options_json TEXT NOT NULL,
        correct_answer_json TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets (id) ON DELETE CASCADE
      )`,
      
      // User attempts table
      `CREATE TABLE IF NOT EXISTS user_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_set_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        time_remaining INTEGER NOT NULL,
        time_taken INTEGER NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        quiz_type TEXT DEFAULT 'default',
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets (id)
      )`,
      
      // Attempt answers table
      `CREATE TABLE IF NOT EXISTS attempt_answers (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        user_answer_json TEXT,
        is_correct BOOLEAN NOT NULL,
        FOREIGN KEY (attempt_id) REFERENCES user_attempts (id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES quiz_questions (id)
      )`,
      
      // Current user session table
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY,
        user_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const tableSQL of tables) {
      db.run(tableSQL);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_set ON quiz_questions (quiz_set_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_attempts_user ON user_attempts (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_attempts_quiz ON user_attempts (quiz_set_id)',
      'CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers (attempt_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
      'CREATE INDEX IF NOT EXISTS idx_quiz_sets_published ON quiz_sets (is_published)'
    ];

    for (const indexSQL of indexes) {
      try {
        db.run(indexSQL);
      } catch (error) {
        // Index might already exist, continue
      }
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Save database to localStorage
  private saveDatabase(): void {
    try {
      const data = db.export();
      localStorage.setItem('awsQuizDatabase', JSON.stringify(Array.from(data)));
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  // Seed default data
  private async seedDefaultData(): Promise<void> {
    // Check if data already exists
    const existingUsers = this.getUsers();
    if (existingUsers.length > 0) {
      return; // Data already seeded
    }

    // Default AWS Quiz Questions
    const defaultQuizQuestions: QuizQuestion[] = [
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-EC2-Auto-Scaling_64.svg",
        imagedesc: "Amazon EC2 Auto Scaling icon",
        question: "Auto Scaling automatically adjusts the number of EC2 instances based on demand",
        choice_type: "radio",
        options: ["True", "False"],
        correct_answer: "True"
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-Lightsail_64.svg", 
        imagedesc: "Amazon Lightsail icon",
        question: "Lightsail is designed for complex enterprise applications requiring high customization",
        choice_type: "radio",
        options: ["True", "False"],
        correct_answer: "False"
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
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-CloudFront_64.svg",
        imagedesc: "Amazon CloudFront icon",
        question: "What are the key benefits of using Amazon CloudFront? (Select all that apply)",
        choice_type: "multiplechoice",
        options: ["Reduced latency", "Global content delivery", "Built-in database", "DDoS protection", "Cost optimization", "Server provisioning"],
        correct_answer: ["Reduced latency", "Global content delivery", "DDoS protection", "Cost optimization"]
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-VPC_64.svg",
        imagedesc: "Amazon VPC icon",
        question: "VPC allows you to create an isolated network within AWS",
        choice_type: "radio",
        options: ["True", "False"], 
        correct_answer: "True"
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_AWS-IAM_64.svg",
        imagedesc: "AWS IAM icon",
        question: "What can you manage with AWS IAM? (Select all that apply)",
        choice_type: "multiplechoice",
        options: ["User identities", "Access permissions", "Database schemas", "Multi-factor authentication", "S3 bucket content", "Password policies"],
        correct_answer: ["User identities", "Access permissions", "Multi-factor authentication", "Password policies"]
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-DynamoDB_64.svg",
        imagedesc: "Amazon DynamoDB icon",
        question: "DynamoDB is what type of database?",
        choice_type: "radio",
        options: ["Relational database", "NoSQL database", "Graph database"],
        correct_answer: "NoSQL database"
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Elastic-Load-Balancing_64.svg",
        imagedesc: "Elastic Load Balancing icon",
        question: "What types of load balancers does AWS offer? (Select all that apply)",
        choice_type: "multiplechoice",
        options: ["Application Load Balancer", "Network Load Balancer", "Gateway Load Balancer", "Classic Load Balancer", "Database Load Balancer", "Storage Load Balancer"],
        correct_answer: ["Application Load Balancer", "Network Load Balancer", "Gateway Load Balancer", "Classic Load Balancer"]
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-ElastiCache_64.svg",
        imagedesc: "Amazon ElastiCache icon",
        question: "Which caching engines does Amazon ElastiCache support? (Select all that apply)",
        choice_type: "multiplechoice",
        options: ["Redis", "Memcached", "MongoDB", "Hazelcast", "MySQL", "DynamoDB"],
        correct_answer: ["Redis", "Memcached"]
      },
      {
        imageurl: "https://holori.com/wp-content/uploads/2022/07/Arch_Amazon-Route-53_64.svg",
        imagedesc: "Amazon Route 53 icon",
        question: "What services does Amazon Route 53 provide? (Select all that apply)",
        choice_type: "multiplechoice",
        options: ["DNS web service", "Domain registration", "Health checking", "Load balancing", "Content delivery", "Database hosting"],
        correct_answer: ["DNS web service", "Domain registration", "Health checking"]
      }
    ];

    // Create default admin user
    const adminId = this.generateId();
    db.run(`
      INSERT INTO users (id, name, email, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [adminId, 'Admin User', 'admin@awsquiz.com', 'admin', new Date().toISOString()]);

    // Create sample student users
    const sampleStudents = [
      { name: 'Alice Johnson', email: 'alice.johnson@student.com' },
      { name: 'Bob Smith', email: 'bob.smith@student.com' },
      { name: 'Carol Davis', email: 'carol.davis@student.com' },
      { name: 'David Wilson', email: 'david.wilson@student.com' }
    ];

    const studentIds: string[] = [];
    for (const student of sampleStudents) {
      const studentId = this.generateId();
      studentIds.push(studentId);
      db.run(`
        INSERT INTO users (id, name, email, role, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [studentId, student.name, student.email, 'user', new Date().toISOString()]);
    }

    // Create default quiz set
    const quizSetId = this.generateId();
    db.run(`
      INSERT INTO quiz_sets (id, name, description, is_published, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      quizSetId,
      'AWS Services Fundamentals',
      'Essential AWS services knowledge test covering EC2, S3, Lambda, and more',
      1, // published
      adminId,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    // Insert quiz questions
    for (let i = 0; i < defaultQuizQuestions.length; i++) {
      const question = defaultQuizQuestions[i];
      const questionId = this.generateId();
      
      db.run(`
        INSERT INTO quiz_questions (
          id, quiz_set_id, image_url, image_desc, question, 
          choice_type, options_json, correct_answer_json, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        questionId,
        quizSetId,
        question.imageurl,
        question.imagedesc,
        question.question,
        question.choice_type,
        JSON.stringify(question.options),
        JSON.stringify(question.correct_answer),
        i
      ]);
    }

    // Generate sample test results
    const sampleResults = [
      { studentIndex: 0, score: 8, percentage: 80, daysAgo: 2 },
      { studentIndex: 1, score: 6, percentage: 60, daysAgo: 1 },
      { studentIndex: 2, score: 9, percentage: 90, daysAgo: 0.125 } // 3 hours ago
    ];

    for (const result of sampleResults) {
      const attemptId = this.generateId();
      const completedAt = new Date(Date.now() - result.daysAgo * 24 * 60 * 60 * 1000).toISOString();
      
      db.run(`
        INSERT INTO user_attempts (
          id, user_id, quiz_set_id, score, total_questions, percentage,
          time_remaining, time_taken, completed_at, quiz_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        attemptId,
        studentIds[result.studentIndex],
        quizSetId,
        result.score,
        10,
        result.percentage,
        result.percentage >= 80 ? 120 : 45, // time remaining
        900 - (result.percentage >= 80 ? 120 : 45), // time taken
        completedAt,
        'default'
      ]);
    }

    this.saveDatabase();
  }

  // User management methods
  public createUser(name: string, email: string, role: 'admin' | 'user' = 'user'): User {
    // Check if user already exists
    const existingUser = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get([email]);

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const userId = this.generateId();
    const createdAt = new Date().toISOString();

    db.run(`
      INSERT INTO users (id, name, email, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, name, email, role, createdAt]);

    this.saveDatabase();

    return {
      id: userId,
      name,
      email,
      role,
      createdAt
    };
  }

  public loginUser(email: string): User | null {
    const userRow = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get([email]);

    if (userRow) {
      const user: User = {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        createdAt: userRow.created_at
      };

      // Set current user session
      db.run('DELETE FROM user_sessions');
      db.run('INSERT INTO user_sessions (user_id) VALUES (?)', [user.id]);
      this.saveDatabase();

      return user;
    }

    return null;
  }

  public logoutUser(): void {
    db.run('DELETE FROM user_sessions');
    this.saveDatabase();
  }

  public getCurrentUser(): User | null {
    const sessionRow = db.prepare(`
      SELECT u.* FROM users u
      JOIN user_sessions s ON u.id = s.user_id
      LIMIT 1
    `).get([]);

    if (sessionRow) {
      return {
        id: sessionRow.id,
        name: sessionRow.name,
        email: sessionRow.email,
        role: sessionRow.role,
        createdAt: sessionRow.created_at
      };
    }

    return null;
  }

  public getUsers(): User[] {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all([]);
    
    return rows.map((row: DatabaseRow) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at
    }));
  }

  // Quiz set management
  public createQuizSet(name: string, description: string, questions: QuizQuestion[], createdBy: string): QuizSet {
    const quizSetId = this.generateId();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO quiz_sets (id, name, description, is_published, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [quizSetId, name, description, 0, createdBy, now, now]);

    // Insert questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionId = this.generateId();
      
      db.run(`
        INSERT INTO quiz_questions (
          id, quiz_set_id, image_url, image_desc, question,
          choice_type, options_json, correct_answer_json, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        questionId,
        quizSetId,
        question.imageurl,
        question.imagedesc,
        question.question,
        question.choice_type,
        JSON.stringify(question.options),
        JSON.stringify(question.correct_answer),
        i
      ]);
    }

    this.saveDatabase();

    return this.getQuizSetById(quizSetId)!;
  }

  public updateQuizSet(id: string, updates: Partial<QuizSet>): QuizSet | null {
    const existingQuizSet = this.getQuizSetById(id);
    if (!existingQuizSet) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.isPublished !== undefined) {
      updateFields.push('is_published = ?');
      values.push(updates.isPublished ? 1 : 0);
    }

    updateFields.push('updated_at = ?');
    values.push(updatedAt);
    values.push(id);

    if (updateFields.length > 1) { // More than just updated_at
      db.run(`
        UPDATE quiz_sets 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, values);

      this.saveDatabase();
    }

    return this.getQuizSetById(id);
  }

  public deleteQuizSet(id: string): boolean {
    const result = db.run('DELETE FROM quiz_sets WHERE id = ?', [id]);
    this.saveDatabase();
    return result.changes > 0;
  }

  public publishQuiz(id: string): boolean {
    return this.updateQuizSet(id, { isPublished: true }) !== null;
  }

  public unpublishQuiz(id: string): boolean {
    return this.updateQuizSet(id, { isPublished: false }) !== null;
  }

  private getQuizSetById(id: string): QuizSet | null {
    const quizRow = db.prepare(`
      SELECT * FROM quiz_sets WHERE id = ?
    `).get([id]);

    if (!quizRow) {
      return null;
    }

    // Get questions for this quiz set
    const questionRows = db.prepare(`
      SELECT * FROM quiz_questions 
      WHERE quiz_set_id = ? 
      ORDER BY order_index
    `).all([id]);

    const questions: QuizQuestion[] = questionRows.map((row: DatabaseRow) => ({
      imageurl: row.image_url,
      imagedesc: row.image_desc,
      question: row.question,
      choice_type: row.choice_type,
      options: JSON.parse(row.options_json),
      correct_answer: JSON.parse(row.correct_answer_json)
    }));

    return {
      id: quizRow.id,
      name: quizRow.name,
      description: quizRow.description,
      questions,
      isPublished: Boolean(quizRow.is_published),
      createdBy: quizRow.created_by,
      createdAt: quizRow.created_at,
      updatedAt: quizRow.updated_at
    };
  }

  public getQuizSets(): QuizSet[] {
    const quizRows = db.prepare(`
      SELECT * FROM quiz_sets ORDER BY updated_at DESC
    `).all([]);

    return quizRows.map((row: DatabaseRow) => this.getQuizSetById(row.id)!).filter(Boolean);
  }

  public getPublishedQuizzes(): QuizSet[] {
    const quizRows = db.prepare(`
      SELECT * FROM quiz_sets WHERE is_published = 1 ORDER BY updated_at DESC
    `).all([]);

    return quizRows.map((row: DatabaseRow) => this.getQuizSetById(row.id)!).filter(Boolean);
  }

  // Test results management
  public saveTestResult(result: Omit<TestResult, 'id'>): TestResult {
    const attemptId = this.generateId();
    
    db.run(`
      INSERT INTO user_attempts (
        id, user_id, quiz_set_id, score, total_questions, percentage,
        time_remaining, time_taken, completed_at, quiz_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      attemptId,
      result.userId,
      'default', // We'll need to map this properly based on questionsUsed
      result.score,
      result.totalQuestions,
      result.percentage,
      result.timeRemaining,
      result.timeTaken,
      result.completedAt,
      result.quizType
    ]);

    this.saveDatabase();

    const savedResult: TestResult = {
      id: attemptId,
      ...result
    };

    return savedResult;
  }

  public getTestResults(): TestResult[] {
    const rows = db.prepare(`
      SELECT 
        ua.*,
        u.name as user_name,
        u.email as user_email
      FROM user_attempts ua
      JOIN users u ON ua.user_id = u.id
      ORDER BY ua.completed_at DESC
    `).all([]);

    return rows.map((row: DatabaseRow) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      score: row.score,
      totalQuestions: row.total_questions,
      percentage: row.percentage,
      timeRemaining: row.time_remaining,
      timeTaken: row.time_taken,
      completedAt: row.completed_at,
      quizType: row.quiz_type,
      questionsUsed: [], // We'll need to reconstruct this from the quiz set
      answers: []
    }));
  }

  public getTestResultsByUser(userId: string): TestResult[] {
    const rows = db.prepare(`
      SELECT 
        ua.*,
        u.name as user_name,
        u.email as user_email
      FROM user_attempts ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.user_id = ?
      ORDER BY ua.completed_at DESC
    `).all([userId]);

    return rows.map((row: DatabaseRow) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      score: row.score,
      totalQuestions: row.total_questions,
      percentage: row.percentage,
      timeRemaining: row.time_remaining,
      timeTaken: row.time_taken,
      completedAt: row.completed_at,
      quizType: row.quiz_type,
      questionsUsed: [],
      answers: []
    }));
  }

  public getTestStatistics() {
    const totalTestsRow = db.prepare('SELECT COUNT(*) as count FROM user_attempts').get([]);
    const totalTests = totalTestsRow.count;

    const uniqueUsersRow = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM user_attempts').get([]);
    const uniqueUsers = uniqueUsersRow.count;

    const avgScoreRow = db.prepare('SELECT AVG(percentage) as avg FROM user_attempts').get([]);
    const averageScore = avgScoreRow.avg || 0;

    const scoreDistribution = {
      excellent: db.prepare('SELECT COUNT(*) as count FROM user_attempts WHERE percentage >= 90').get([]).count,
      good: db.prepare('SELECT COUNT(*) as count FROM user_attempts WHERE percentage >= 70 AND percentage < 90').get([]).count,
      average: db.prepare('SELECT COUNT(*) as count FROM user_attempts WHERE percentage >= 50 AND percentage < 70').get([]).count,
      poor: db.prepare('SELECT COUNT(*) as count FROM user_attempts WHERE percentage < 50').get([]).count
    };

    return {
      totalTests,
      uniqueUsers,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreDistribution
    };
  }

  // Migration method to convert localStorage data to database
  public async migrateFromLocalStorage(): Promise<boolean> {
    try {
      const localStorageData = localStorage.getItem('awsQuizAppState');
      if (!localStorageData) {
        return false; // No data to migrate
      }

      const appState: AppState = JSON.parse(localStorageData);
      
      // Clear existing database data
      db.run('DELETE FROM user_sessions');
      db.run('DELETE FROM attempt_answers');
      db.run('DELETE FROM user_attempts');
      db.run('DELETE FROM quiz_questions');
      db.run('DELETE FROM quiz_sets');
      db.run('DELETE FROM users');

      // Migrate users
      for (const user of appState.users) {
        db.run(`
          INSERT INTO users (id, name, email, role, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [user.id, user.name, user.email, user.role, user.createdAt]);
      }

      // Migrate quiz sets
      for (const quizSet of appState.quizSets) {
        db.run(`
          INSERT INTO quiz_sets (id, name, description, is_published, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          quizSet.id,
          quizSet.name,
          quizSet.description,
          quizSet.isPublished ? 1 : 0,
          quizSet.createdBy,
          quizSet.createdAt,
          quizSet.updatedAt
        ]);

        // Migrate questions for this quiz set
        for (let i = 0; i < quizSet.questions.length; i++) {
          const question = quizSet.questions[i];
          const questionId = this.generateId();
          
          db.run(`
            INSERT INTO quiz_questions (
              id, quiz_set_id, image_url, image_desc, question,
              choice_type, options_json, correct_answer_json, order_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            questionId,
            quizSet.id,
            question.imageurl,
            question.imagedesc,
            question.question,
            question.choice_type,
            JSON.stringify(question.options),
            JSON.stringify(question.correct_answer),
            i
          ]);
        }
      }

      // Migrate test results
      for (const result of appState.testResults) {
        db.run(`
          INSERT INTO user_attempts (
            id, user_id, quiz_set_id, score, total_questions, percentage,
            time_remaining, time_taken, completed_at, quiz_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          result.id,
          result.userId,
          'default', // Map to appropriate quiz set
          result.score,
          result.totalQuestions,
          result.percentage,
          result.timeRemaining,
          result.timeTaken,
          result.completedAt,
          result.quizType || 'default'
        ]);
      }

      // Set current user if exists
      if (appState.currentUser) {
        db.run('INSERT INTO user_sessions (user_id) VALUES (?)', [appState.currentUser.id]);
      }

      this.saveDatabase();
      
      // Remove old localStorage data after successful migration
      localStorage.removeItem('awsQuizAppState');
      
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  // Export database for backup
  public exportDatabase(): Uint8Array {
    return db.export();
  }

  // Import database from backup
  public importDatabase(data: Uint8Array): boolean {
    try {
      db.close();
      db = new SQL.Database(data);
      this.saveDatabase();
      return true;
    } catch (error) {
      console.error('Failed to import database:', error);
      return false;
    }
  }

  // Demo utility method to reset all data
  public resetDemoData(): void {
    // Clear all tables
    db.run('DELETE FROM user_sessions');
    db.run('DELETE FROM attempt_answers');
    db.run('DELETE FROM user_attempts');
    db.run('DELETE FROM quiz_questions');
    db.run('DELETE FROM quiz_sets');
    db.run('DELETE FROM users');
    
    // Re-seed default data
    this.seedDefaultData();
  }
}

export const databaseService = DatabaseService.getInstance();