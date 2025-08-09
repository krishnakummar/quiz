// MySQL Database Service for ProQuiz Application
// Handles connection, schema creation, and data operations with MySQL

import { User, TestResult, QuizSet, QuizQuestion, Tenant } from './types';

export interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  acquireTimeout?: number;
  timezone?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  serverVersion?: string;
  connectionTime?: number;
}

class MySQLDatabaseService {
  private static instance: MySQLDatabaseService;
  private config: MySQLConfig | null = null;
  private isConnected = false;
  private connectionStatus: ConnectionStatus = { connected: false };

  private constructor() {}

  public static getInstance(): MySQLDatabaseService {
    if (!MySQLDatabaseService.instance) {
      MySQLDatabaseService.instance = new MySQLDatabaseService();
    }
    return MySQLDatabaseService.instance;
  }

  // Set MySQL configuration
  public setConfig(config: MySQLConfig): void {
    this.config = config;
    this.isConnected = false;
    this.connectionStatus = { connected: false };
  }

  public getConfig(): MySQLConfig | null {
    return this.config;
  }

  // Test database connection
  public async testConnection(config?: MySQLConfig): Promise<ConnectionStatus> {
    const testConfig = config || this.config;
    if (!testConfig) {
      return { connected: false, error: 'No database configuration provided' };
    }

    try {
      const startTime = Date.now();
      
      // In a real implementation, this would make an API call to test the connection
      const response = await this.makeAPICall('/api/db/test-connection', {
        method: 'POST',
        body: JSON.stringify(testConfig)
      });

      if (response.success) {
        const connectionTime = Date.now() - startTime;
        this.connectionStatus = {
          connected: true,
          serverVersion: response.serverVersion,
          connectionTime
        };
        this.isConnected = true;
      } else {
        this.connectionStatus = {
          connected: false,
          error: response.error || 'Connection failed'
        };
        this.isConnected = false;
      }
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
      this.isConnected = false;
    }

    return this.connectionStatus;
  }

  // Initialize database schema
  public async initializeSchema(): Promise<{ success: boolean; error?: string }> {
    if (!this.config || !this.isConnected) {
      return { success: false, error: 'Database not connected' };
    }

    try {
      const response = await this.makeAPICall('/api/db/initialize-schema', {
        method: 'POST',
        body: JSON.stringify({ config: this.config })
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Schema initialization failed'
      };
    }
  }

  // Migrate data from localStorage to MySQL
  public async migrateFromLocalStorage(localStorageData: any): Promise<{ success: boolean; error?: string; migratedCounts?: any }> {
    if (!this.config || !this.isConnected) {
      return { success: false, error: 'Database not connected' };
    }

    try {
      const response = await this.makeAPICall('/api/db/migrate-data', {
        method: 'POST',
        body: JSON.stringify({
          config: this.config,
          data: localStorageData
        })
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Data migration failed'
      };
    }
  }

  // Get database health and statistics
  public async getDatabaseHealth(): Promise<{
    healthy: boolean;
    stats?: {
      totalTenants: number;
      totalUsers: number;
      totalQuizzes: number;
      totalAttempts: number;
      databaseSize: string;
      uptime: string;
    };
    error?: string;
  }> {
    if (!this.config || !this.isConnected) {
      return { healthy: false, error: 'Database not connected' };
    }

    try {
      const response = await this.makeAPICall('/api/db/health', {
        method: 'GET'
      });

      return response;
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  // Generic API call helper
  private async makeAPICall(endpoint: string, options: RequestInit = {}): Promise<any> {
    // In a real implementation, this would make HTTP requests to your backend API
    // For now, we'll simulate the responses
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Mock responses based on endpoint
    switch (endpoint) {
      case '/api/db/test-connection':
        return this.mockTestConnection();
      
      case '/api/db/initialize-schema':
        return this.mockInitializeSchema();
      
      case '/api/db/migrate-data':
        return this.mockMigrateData();
      
      case '/api/db/health':
        return this.mockHealthCheck();
      
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  // Mock responses (in real implementation, these would be actual API calls)
  private mockTestConnection(): any {
    if (!this.config) {
      return { success: false, error: 'No configuration provided' };
    }

    // Simulate connection validation
    if (!this.config.host || !this.config.database || !this.config.username) {
      return { success: false, error: 'Missing required connection parameters' };
    }

    // Simulate successful connection
    return {
      success: true,
      serverVersion: '8.0.35',
      message: 'Connection successful'
    };
  }

  private mockInitializeSchema(): any {
    return {
      success: true,
      message: 'Database schema initialized successfully',
      tablesCreated: [
        'tenants',
        'users', 
        'quiz_sets',
        'quiz_questions',
        'user_attempts',
        'attempt_answers',
        'user_sessions',
        'system_config'
      ]
    };
  }

  private mockMigrateData(): any {
    return {
      success: true,
      message: 'Data migration completed successfully',
      migratedCounts: {
        tenants: 3,
        users: 15,
        quizSets: 8,
        questions: 45,
        attempts: 127,
        answers: 634
      }
    };
  }

  private mockHealthCheck(): any {
    return {
      healthy: true,
      stats: {
        totalTenants: 12,
        totalUsers: 156,
        totalQuizzes: 23,
        totalAttempts: 1247,
        databaseSize: '15.7 MB',
        uptime: '72h 34m'
      }
    };
  }

  // MySQL-specific CRUD operations would go here
  // These would replace the localStorage operations in the main data service

  public async createTenant(tenant: Tenant): Promise<Tenant> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(tenant)
    });
    
    return response.data;
  }

  public async getTenants(): Promise<Tenant[]> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall('/api/tenants', {
      method: 'GET'
    });
    
    return response.data || [];
  }

  public async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall(`/api/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    return response.data;
  }

  public async deleteTenant(id: string): Promise<boolean> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall(`/api/tenants/${id}`, {
      method: 'DELETE'
    });
    
    return response.success;
  }

  // Similar methods would be implemented for Users, QuizSets, etc.
  public async createUser(user: User, password: string): Promise<User> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall('/api/users', {
      method: 'POST',
      body: JSON.stringify({ ...user, password })
    });
    
    return response.data;
  }

  public async getUsers(): Promise<User[]> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall('/api/users', {
      method: 'GET'
    });
    
    return response.data || [];
  }

  public async createQuizSet(quizSet: QuizSet): Promise<QuizSet> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall('/api/quiz-sets', {
      method: 'POST',
      body: JSON.stringify(quizSet)
    });
    
    return response.data;
  }

  public async getQuizSets(): Promise<QuizSet[]> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall('/api/quiz-sets', {
      method: 'GET'
    });
    
    return response.data || [];
  }

  public async saveTestResult(result: TestResult): Promise<TestResult> {
    if (!this.isConnected) throw new Error('Database not connected');
    
    const response = await this.makeAPICall('/api/test-results', {
      method: 'POST',
      body: JSON.stringify(result)
    });
    
    return response.data;
  }
  
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public isConnectionHealthy(): boolean {
    return this.isConnected && this.connectionStatus.connected;
  }
}

// SQL Schema for MySQL database
export const MYSQL_SCHEMA_SQL = `
-- ProQuiz MySQL Database Schema
-- Version: 1.0.0

-- Enable UTF8MB4 for full Unicode support
SET NAMES utf8mb4;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS proquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE proquiz_db;

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  domain VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_by VARCHAR(255) NULL,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  settings_json JSON,
  INDEX idx_tenant_status (status),
  INDEX idx_tenant_created_by (created_by),
  INDEX idx_tenant_approved_by (approved_by)
) ENGINE=InnoDB;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('product-admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  tenant_id VARCHAR(255) NULL,
  status ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_user_email (email),
  INDEX idx_user_tenant (tenant_id),
  INDEX idx_user_role (role),
  INDEX idx_user_status (status)
) ENGINE=InnoDB;

-- Quiz sets table
CREATE TABLE IF NOT EXISTS quiz_sets (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id VARCHAR(255) NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_quiz_tenant (tenant_id),
  INDEX idx_quiz_created_by (created_by),
  INDEX idx_quiz_published (is_published)
) ENGINE=InnoDB;

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id VARCHAR(255) PRIMARY KEY,
  quiz_set_id VARCHAR(255) NOT NULL,
  image_url TEXT,
  image_desc TEXT,
  question TEXT NOT NULL,
  choice_type ENUM('radio', 'multiplechoice') NOT NULL,
  options_json JSON NOT NULL,
  correct_answer_json JSON NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets(id) ON DELETE CASCADE,
  INDEX idx_question_quiz_set (quiz_set_id),
  INDEX idx_question_order (quiz_set_id, order_index)
) ENGINE=InnoDB;

-- User attempts table
CREATE TABLE IF NOT EXISTS user_attempts (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NULL,
  quiz_set_id VARCHAR(255) NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  time_remaining INT NOT NULL,
  time_taken INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quiz_type VARCHAR(50) DEFAULT 'default',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_set_id) REFERENCES quiz_sets(id) ON DELETE CASCADE,
  INDEX idx_attempt_user (user_id),
  INDEX idx_attempt_tenant (tenant_id),
  INDEX idx_attempt_quiz_set (quiz_set_id),
  INDEX idx_attempt_completed (completed_at)
) ENGINE=InnoDB;

-- Attempt answers table
CREATE TABLE IF NOT EXISTS attempt_answers (
  id VARCHAR(255) PRIMARY KEY,
  attempt_id VARCHAR(255) NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  user_answer_json JSON,
  is_correct BOOLEAN NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES user_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  INDEX idx_answer_attempt (attempt_id),
  INDEX idx_answer_question (question_id)
) ENGINE=InnoDB;

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_user (user_id),
  INDEX idx_session_expires (expires_at)
) ENGINE=InnoDB;

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
  id VARCHAR(255) PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value JSON,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB;

-- Create initial system configuration entries
INSERT INTO system_config (id, config_key, config_value, description) VALUES 
('db_version', 'database_version', '"1.0.0"', 'Database schema version'),
('migration_status', 'migration_completed', 'false', 'Whether data migration from localStorage is completed'),
('app_settings', 'application_settings', '{"maintenance_mode": false, "allow_registration": true}', 'Global application settings')
ON DUPLICATE KEY UPDATE 
  config_value = VALUES(config_value),
  updated_at = CURRENT_TIMESTAMP;
`;

export const mysqlService = MySQLDatabaseService.getInstance();