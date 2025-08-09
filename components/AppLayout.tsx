import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from './ui/sidebar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  BarChart3,
  FileText,
  Trophy,
  Users,
  Settings,
  BookOpen,
  Database,
  User,
  LogOut,
  Home,
  GraduationCap,
  Building2,
  Crown,
  Clock,
  HardDrive,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { User as UserType } from './types';
import { LogoMini } from './Logo';
import { mysqlService } from './mysqlService';

// Define navigation items for different user roles
const productAdminNavItems = [
  {
    title: 'System Overview',
    icon: BarChart3,
    id: 'overview',
    description: 'System-wide analytics and health'
  },
  {
    title: 'Tenant Approvals',
    icon: Clock,
    id: 'approvals',
    description: 'Review and approve new tenant requests'
  },
  {
    title: 'Tenant Management',
    icon: Building2,
    id: 'tenants',
    description: 'Create and manage tenants'
  },
  {
    title: 'User Management',
    icon: Users,
    id: 'users',
    description: 'Manage users across tenants'
  },
  {
    title: 'System Configuration',
    icon: Database,
    id: 'config',
    description: 'Configure database and system settings'
  }
];

const adminNavItems = [
  {
    title: 'Overview',
    icon: BarChart3,
    id: 'overview',
    description: 'Dashboard analytics'
  },
  {
    title: 'Quiz Management',
    icon: FileText,
    id: 'quizzes',
    description: 'Create and manage quizzes'
  },
  {
    title: 'Test Results',
    icon: Trophy,
    id: 'results',
    description: 'View all test results'
  },
  {
    title: 'User Management',
    icon: Users,
    id: 'users',
    description: 'Manage users'
  }
];

const userNavItems = [
  {
    title: 'Dashboard',
    icon: Home,
    id: 'dashboard',
    description: 'Your progress overview'
  },
  {
    title: 'Available Quizzes',
    icon: BookOpen,
    id: 'quizzes',
    description: 'Take available quizzes'
  },
  {
    title: 'My Results',
    icon: Trophy,
    id: 'results',
    description: 'View your test results'
  }
];

interface AppLayoutProps {
  currentUser: UserType;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onStartTest: (quizId?: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppLayout({
  currentUser,
  activeSection,
  onSectionChange,
  onStartTest,
  onLogout,
  children
}: AppLayoutProps) {
  const navItems = currentUser.role === 'product-admin' 
    ? productAdminNavItems 
    : currentUser.role === 'admin' 
      ? adminNavItems 
      : userNavItems;
  const isAdmin = currentUser.role === 'admin';
  const isProductAdmin = currentUser.role === 'product-admin';
  
  // Check database connection status
  const useMySQL = localStorage.getItem('use_mysql') === 'true';
  const mysqlConnected = useMySQL && mysqlService.isConnectionHealthy();
  const databaseMode = mysqlConnected ? 'MySQL' : 'localStorage';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar variant="inset">
          <SidebarHeader>
            <div className="flex items-center gap-3 px-2 py-3">
              <LogoMini />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {isProductAdmin ? 'Product Admin Portal' : isAdmin ? 'Admin Portal' : 'Student Portal'}
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>
                <div className="flex items-center gap-2">
                  {isProductAdmin ? (
                    <>
                      <Crown className="w-4 h-4" />
                      System Administration
                    </>
                  ) : isAdmin ? (
                    <>
                      <Settings className="w-4 h-4" />
                      Administration
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      Learning
                    </>
                  )}
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={activeSection === item.id}
                        onClick={() => onSectionChange(item.id)}
                        tooltip={item.description}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            {/* Database Status Indicator */}
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    mysqlConnected ? 'bg-success/20' : 'bg-secondary/20'
                  }`}>
                    {mysqlConnected ? (
                      <Database className="w-4 h-4 text-success" />
                    ) : (
                      <HardDrive className="w-4 h-4 text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-sidebar-foreground">
                      Database: {databaseMode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mysqlConnected ? 'Production Ready' : 'Development Mode'}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    mysqlConnected ? 'bg-success' : 'bg-secondary'
                  }`}></div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className={`w-8 h-8 ${
                    isProductAdmin ? 'bg-warning/20' :
                    isAdmin ? 'bg-warning/10' : 'bg-primary/10'
                  } rounded-full flex items-center justify-center`}>
                    {isProductAdmin ? (
                      <Crown className="w-4 h-4 text-warning" />
                    ) : (
                      <User className={`w-4 h-4 ${isAdmin ? 'text-warning' : 'text-primary'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <Badge className={
                    isProductAdmin ? "bg-gradient-to-r from-warning to-warning/80 text-white" :
                    isAdmin ? "bg-warning text-white" : "bg-primary text-white"
                  }>
                    {isProductAdmin ? 'Product Admin' : isAdmin ? 'Admin' : 'Student'}
                  </Badge>
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onLogout} tooltip="Sign out">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          {/* Header with sidebar trigger */}
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-sidebar-border">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center gap-2 px-3">
              <h1 className="text-lg font-semibold text-foreground">
                {navItems.find(item => item.id === activeSection)?.title || 
                  (isProductAdmin ? 'System Overview' : 'Dashboard')}
              </h1>
            </div>
          </header>

          {/* Main content area */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}