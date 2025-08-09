import React, { useState, useEffect } from 'react';
import { UserAuth } from './components/UserAuth';
import { AppLayout } from './components/AppLayout';
import { AdminContent } from './components/AdminContent';
import { UserContent } from './components/UserContent';
import { ProductAdminContent } from './components/ProductAdminContent';
import { TestInterface } from './components/TestInterface';
import { Toaster } from './components/ui/sonner';
import { dataService } from './components/dataServiceNew';
import { User, TestResult } from './components/types';
import { Logo } from './components/Logo';

type AppView = 'auth' | 'dashboard' | 'test';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('auth');
  const [activeSection, setActiveSection] = useState<string>('');
  const [selectedQuizId, setSelectedQuizId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setInitError(null);
      
      // Initialize database
      await dataService.initializeApp();
      
      // Check if user is already logged in
      const user = dataService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setCurrentView('dashboard');
        setActiveSection(user.role === 'admin' ? 'overview' : 'dashboard');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setInitError('Failed to initialize the database system. This may be due to browser storage limitations. Please try refreshing the page or clearing your browser data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    // Set default active section based on user role
    setActiveSection(
      user.role === 'product-admin' ? 'overview' : 
      user.role === 'admin' ? 'overview' : 
      'dashboard'
    );
  };

  const handleLogout = () => {
    dataService.logoutUser();
    setCurrentUser(null);
    setCurrentView('auth');
    setActiveSection('');
    setSelectedQuizId(undefined);
  };

  const handleStartTest = (quizId?: string) => {
    setSelectedQuizId(quizId);
    setCurrentView('test');
  };

  const handleTestComplete = (result: TestResult) => {
    // Test completed, stay on test view to show results
    // User can navigate back to dashboard from there
    // Force a re-render to update attempts count when user returns to dashboard
    console.log('Test completed:', result);
  };

  const handleBackToDashboard = () => {
    setSelectedQuizId(undefined);
    if (currentUser) {
      setCurrentView('dashboard');
      setActiveSection(
        currentUser.role === 'product-admin' ? 'overview' : 
        currentUser.role === 'admin' ? 'overview' : 
        'dashboard'
      );
    } else {
      setCurrentView('auth');
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const renderCurrentView = () => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6">
            <Logo variant="large" className="justify-center" />
            <div className="space-y-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Initializing Database...</h2>
                <p className="text-sm text-muted-foreground">Setting up relational database with localStorage backend</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (initError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 max-w-md">
            <Logo variant="large" className="justify-center" />
            <div className="space-y-4">
              <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-danger">⚠️</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Initialization Error</h2>
                <p className="text-sm text-muted-foreground">{initError}</p>
                <button
                  onClick={initializeApp}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'auth':
        return <UserAuth onUserLogin={handleUserLogin} />;
      
      case 'dashboard':
        return currentUser ? (
          <AppLayout
            currentUser={currentUser}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            onStartTest={handleStartTest}
            onLogout={handleLogout}
          >
            {currentUser.role === 'product-admin' ? (
              <ProductAdminContent 
                currentUser={currentUser}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            ) : currentUser.role === 'admin' ? (
              <AdminContent 
                currentUser={currentUser}
                activeSection={activeSection}
                onStartTest={handleStartTest}
              />
            ) : (
              <UserContent 
                currentUser={currentUser}
                activeSection={activeSection}
                onStartTest={handleStartTest}
              />
            )}
          </AppLayout>
        ) : null;
      
      case 'test':
        return currentUser ? (
          <TestInterface 
            currentUser={currentUser}
            quizId={selectedQuizId}
            onTestComplete={handleTestComplete}
            onBackToDashboard={handleBackToDashboard}
          />
        ) : null;
      
      default:
        return <UserAuth onUserLogin={handleUserLogin} />;
    }
  };

  return (
    <>
      {renderCurrentView()}
      
      {/* Toast notifications with Bootstrap colors */}
      <Toaster 
        toastOptions={{
          style: {
            border: '2px solid var(--bs-primary)',
            borderRadius: '0.375rem',
          },
        }}
      />
    </>
  );
}