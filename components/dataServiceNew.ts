import { databaseService } from './databaseServiceFixed';
import { mysqlService } from './mysqlService';
import { User, TestResult, QuizSet, QuizQuestion, AppState, Tenant } from './types';

// Hybrid Database Service Adapter with Multi-Tenancy Support
// Provides tenant isolation, product admin capabilities, and MySQL integration
class DataServiceAdapter {
  private static instance: DataServiceAdapter;
  private isInitialized = false;
  
  private constructor() {}
  
  // Check if MySQL should be used
  private shouldUseMySQL(): boolean {
    const useMySQL = localStorage.getItem('use_mysql') === 'true';
    return useMySQL && mysqlService.isConnectionHealthy();
  }
  
  public static getInstance(): DataServiceAdapter {
    if (!DataServiceAdapter.instance) {
      DataServiceAdapter.instance = new DataServiceAdapter();
    }
    return DataServiceAdapter.instance;
  }

  // Initialize app with database
  public async initializeApp(): Promise<AppState> {
    if (!this.isInitialized) {
      try {
        // Load MySQL configuration if exists
        const mysqlConfig = localStorage.getItem('mysql_config');
        if (mysqlConfig) {
          try {
            mysqlService.setConfig(JSON.parse(mysqlConfig));
            await mysqlService.testConnection();
          } catch (error) {
            console.warn('MySQL configuration loaded but connection failed:', error);
          }
        }

        await databaseService.initializeDatabase();
        
        // Try to migrate from localStorage if it exists
        const migrated = await databaseService.migrateFromLocalStorage();
        if (migrated) {
          console.log('Successfully migrated data from localStorage to relational database');
        }
        
        // Verify database health
        if (!databaseService.isDatabaseHealthy()) {
          throw new Error('Database health check failed');
        }
        
        // Initialize default product admin and demo tenant if none exists
        await this.initializeDefaultData();
        
        this.isInitialized = true;
        console.log('Database initialized successfully with multi-tenant structure');
        
        if (this.shouldUseMySQL()) {
          console.log('MySQL connection active - using MySQL for operations');
        } else {
          console.log('Using localStorage-based database');
        }
      } catch (error) {
        console.error('Database initialization failed:', error);
        this.isInitialized = false;
        throw error;
      }
    }
    
    return this.getAppState();
  }

  // Initialize default data for first run
  private async initializeDefaultData(): void {
    try {
      // Check if product admin exists
      const users = this.getUsers();
      const productAdmin = users.find(u => u.role === 'product-admin');
      
      if (!productAdmin) {
        // Create default product admin only
        const defaultProductAdmin = this.createUser(
          'Product Administrator',
          'product.admin@aws-quiz.demo',
          'wel123',
          'product-admin'
        );
        console.log('Created default product admin:', defaultProductAdmin.email);
      }
    } catch (error) {
      console.warn('Failed to initialize default data:', error);
    }
  }

  // Get app state (for compatibility)
  public getAppState(): AppState {
    return {
      currentUser: this.getCurrentUser(),
      users: this.getUsers(),
      testResults: this.getTestResults(),
      quizSets: this.getQuizSets(),
      publishedQuizzes: this.getPublishedQuizzes(),
      tenants: this.getTenants()
    };
  }

  // Save app state (no-op for database version)
  public saveAppState(state: AppState): void {
    // Database operations are automatically saved
    console.log('saveAppState called - using database auto-save');
  }

  // ===== TENANT MANAGEMENT =====

  public createTenant(name: string, description: string, createdBy: string, status: 'pending' | 'approved' | 'rejected' = 'approved'): Tenant {
    const tenant: Tenant = {
      id: `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      status,
      isActive: status === 'approved',
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        allowUserRegistration: true,
        maxAdmins: 5,
        maxUsers: 100,
        maxQuizzes: 50
      }
    };

    if (this.shouldUseMySQL()) {
      try {
        return mysqlService.createTenant(tenant);
      } catch (error) {
        console.warn('MySQL createTenant failed, falling back to localStorage:', error);
      }
    }
    return databaseService.createTenant(tenant);
  }

  public createTenantAndAdmin(adminName: string, adminEmail: string, adminPassword: string, tenantName: string): { tenant: Tenant; user: User } {
    // Check if email already exists
    const existingUsers = this.getUsers();
    if (existingUsers.some(u => u.email === adminEmail)) {
      throw new Error('A user with this email already exists');
    }

    // Create pending tenant
    const tenant = this.createTenant(tenantName, `Tenant for ${adminName}`, 'system', 'pending');

    // Create admin user in pending status
    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      tenantId: tenant.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const createdUser = databaseService.createUserWithStatus(user, adminPassword);

    return { tenant, user: createdUser };
  }

  public updateTenant(id: string, updates: Partial<Tenant>): Tenant | null {
    return databaseService.updateTenant(id, { ...updates, updatedAt: new Date().toISOString() });
  }

  public deleteTenant(id: string): boolean {
    // First, check if there are any users in this tenant
    const tenantUsers = this.getUsersByTenant(id);
    if (tenantUsers.length > 0) {
      throw new Error('Cannot delete tenant with existing users. Please remove all users first.');
    }

    // Delete all quiz sets for this tenant
    const tenantQuizzes = this.getQuizSetsByTenant(id);
    tenantQuizzes.forEach(quiz => this.deleteQuizSet(quiz.id));

    // Delete all test results for this tenant
    const tenantResults = this.getTestResultsByTenant(id);
    tenantResults.forEach(result => databaseService.deleteTestResult(result.id));

    return databaseService.deleteTenant(id);
  }

  public getTenants(): Tenant[] {
    if (this.shouldUseMySQL()) {
      try {
        return mysqlService.getTenants();
      } catch (error) {
        console.warn('MySQL getTenants failed, falling back to localStorage:', error);
      }
    }
    return databaseService.getTenants();
  }

  public getTenant(id: string): Tenant | null {
    return databaseService.getTenant(id);
  }

  public activateTenant(id: string): boolean {
    return databaseService.updateTenant(id, { isActive: true, updatedAt: new Date().toISOString() }) !== null;
  }

  public deactivateTenant(id: string): boolean {
    return databaseService.updateTenant(id, { isActive: false, updatedAt: new Date().toISOString() }) !== null;
  }

  // ===== USER MANAGEMENT WITH TENANT SUPPORT =====

  public createUser(name: string, email: string, password: string, role: 'product-admin' | 'admin' | 'user' = 'user', tenantId?: string): User {
    // Validate tenant requirements
    if (role === 'product-admin' && tenantId) {
      throw new Error('Product admin cannot belong to a tenant');
    }
    if ((role === 'admin' || role === 'user') && !tenantId) {
      throw new Error('Admin and user roles must belong to a tenant');
    }

    return databaseService.createUser(name, email, password, role, tenantId);
  }

  public approveTenant(tenantId: string, approvedBy: string): boolean {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Update tenant status to approved
    const updatedTenant = this.updateTenant(tenantId, {
      status: 'approved',
      isActive: true,
      approvedBy,
      approvedAt: new Date().toISOString()
    });

    if (updatedTenant) {
      // Activate all pending users for this tenant
      const tenantUsers = this.getUsersByTenant(tenantId);
      tenantUsers.forEach(user => {
        if (user.status === 'pending') {
          databaseService.updateUserStatus(user.id, 'active');
        }
      });
      return true;
    }
    return false;
  }

  public rejectTenant(tenantId: string, rejectedBy: string, reason: string): boolean {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Update tenant status to rejected
    const updatedTenant = this.updateTenant(tenantId, {
      status: 'rejected',
      isActive: false,
      approvedBy: rejectedBy,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason
    });

    return updatedTenant !== null;
  }

  public getPendingTenants(): Tenant[] {
    return this.getTenants().filter(t => t.status === 'pending');
  }

  public loginUser(email: string, password: string): User | null {
    const user = databaseService.loginUser(email, password);
    
    // Check if user is pending approval
    if (user && user.status === 'pending') {
      return null; // Don't allow login for pending users
    }
    
    return user;
  }

  public resetPassword(email: string, newPassword: string): boolean {
    return databaseService.resetPassword(email, newPassword);
  }

  public logoutUser(): void {
    databaseService.logoutUser();
  }

  public getCurrentUser(): User | null {
    return databaseService.getCurrentUser();
  }

  public getUsers(): User[] {
    return databaseService.getUsers();
  }

  public getUsersByTenant(tenantId: string): User[] {
    return databaseService.getUsers().filter(user => user.tenantId === tenantId);
  }

  public getProductAdmins(): User[] {
    return databaseService.getUsers().filter(user => user.role === 'product-admin');
  }

  // ===== QUIZ SET MANAGEMENT WITH TENANT ISOLATION =====

  public createQuizSet(name: string, description: string, questions: QuizQuestion[], createdBy: string, tenantId?: string): QuizSet {
    return databaseService.createQuizSet(name, description, questions, createdBy, tenantId);
  }

  public updateQuizSet(id: string, updates: Partial<QuizSet>): QuizSet | null {
    return databaseService.updateQuizSet(id, updates);
  }

  public deleteQuizSet(id: string): boolean {
    return databaseService.deleteQuizSet(id);
  }

  public publishQuiz(id: string): boolean {
    return databaseService.publishQuiz(id);
  }

  public unpublishQuiz(id: string): boolean {
    return databaseService.unpublishQuiz(id);
  }

  public getQuizSets(tenantId?: string): QuizSet[] {
    const allQuizSets = databaseService.getQuizSets();
    if (tenantId) {
      return allQuizSets.filter(quiz => quiz.tenantId === tenantId);
    }
    return allQuizSets;
  }

  public getQuizSetsByTenant(tenantId: string): QuizSet[] {
    return this.getQuizSets(tenantId);
  }

  public getPublishedQuizzes(tenantId?: string): QuizSet[] {
    const allPublished = databaseService.getPublishedQuizzes();
    if (tenantId) {
      return allPublished.filter(quiz => quiz.tenantId === tenantId);
    }
    return allPublished;
  }

  // ===== TEST RESULTS WITH TENANT ISOLATION =====

  public saveTestResult(result: Omit<TestResult, 'id'> & { quizSetId?: string }): TestResult {
    return databaseService.saveTestResult(result);
  }

  public getTestResults(tenantId?: string): TestResult[] {
    const allResults = databaseService.getTestResults();
    if (tenantId) {
      return allResults.filter(result => result.tenantId === tenantId);
    }
    return allResults;
  }

  public getTestResultsByUser(userId: string): TestResult[] {
    return databaseService.getTestResultsByUser(userId);
  }

  public getTestResultsByTenant(tenantId: string): TestResult[] {
    return this.getTestResults(tenantId);
  }

  public getTestStatistics(tenantId?: string) {
    return databaseService.getTestStatistics(tenantId);
  }

  // Quiz attempts methods
  public getQuizSetAttempts(quizSetId: string): number {
    return databaseService.getQuizSetAttempts(quizSetId);
  }

  public getUserQuizSetAttempts(userId: string, quizSetId: string): number {
    return databaseService.getUserQuizSetAttempts(userId, quizSetId);
  }

  public getUserBestScoreForQuiz(userId: string, quizSetId: string): number | null {
    return databaseService.getUserBestScoreForQuiz(userId, quizSetId);
  }

  // ===== TENANT STATISTICS =====

  public getTenantStatistics(tenantId: string) {
    const users = this.getUsersByTenant(tenantId);
    const quizzes = this.getQuizSetsByTenant(tenantId);
    const results = this.getTestResultsByTenant(tenantId);

    return {
      totalUsers: users.length,
      totalAdmins: users.filter(u => u.role === 'admin').length,
      totalStudents: users.filter(u => u.role === 'user').length,
      totalQuizzes: quizzes.length,
      publishedQuizzes: quizzes.filter(q => q.isPublished).length,
      totalTests: results.length,
      averageScore: results.length > 0 ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length : 0
    };
  }

  // ===== SYSTEM-WIDE STATISTICS FOR PRODUCT ADMIN =====

  public getSystemStatistics() {
    const tenants = this.getTenants();
    const allUsers = this.getUsers();
    const allQuizzes = this.getQuizSets();
    const allResults = this.getTestResults();

    return {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.isActive).length,
      totalUsers: allUsers.length,
      productAdmins: allUsers.filter(u => u.role === 'product-admin').length,
      totalAdmins: allUsers.filter(u => u.role === 'admin').length,
      totalStudents: allUsers.filter(u => u.role === 'user').length,
      totalQuizzes: allQuizzes.length,
      totalTests: allResults.length,
      systemAverageScore: allResults.length > 0 ? allResults.reduce((sum, r) => sum + r.percentage, 0) / allResults.length : 0
    };
  }

  // Demo utility methods
  public resetDemoData(): void {
    databaseService.resetDemoData();
    // Reinitialize default data after reset (product admin only)
    this.initializeDefaultData();
  }

  // Database-specific methods
  public async exportDatabase(): Promise<Blob> {
    const data = databaseService.exportDatabase();
    return new Blob([data], { type: 'application/octet-stream' });
  }

  public async importDatabase(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      return databaseService.importDatabase(data);
    } catch (error) {
      console.error('Failed to import database:', error);
      return false;
    }
  }

  // Health check method
  public isDatabaseHealthy(): boolean {
    try {
      // Try a simple query to check if database is working
      this.getUsers();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

export const dataService = DataServiceAdapter.getInstance();