import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  BarChart3,
  Globe,
  Shield,
  Trash2,
  Edit3,
  UserPlus,
  Crown,
  Eye,
  EyeOff,
  TrendingUp,
  FileText,
  Trophy,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { dataService } from './dataServiceNew';
import { User, Tenant } from './types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { SystemConfiguration } from './SystemConfiguration';

interface ProductAdminContentProps {
  currentUser: User;
  activeSection: string;
  onSectionChange?: (section: string) => void;
}

export function ProductAdminContent({ currentUser, activeSection, onSectionChange }: ProductAdminContentProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<any>({});
  const [pendingTenants, setPendingTenants] = useState<Tenant[]>([]);
  const [isCreateTenantDialogOpen, setIsCreateTenantDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newTenant, setNewTenant] = useState({
    name: '',
    description: '',
    domain: '',
    maxAdmins: 5,
    maxUsers: 100,
    maxQuizzes: 50,
    allowUserRegistration: true
  });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'user',
    tenantId: ''
  });

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = () => {
    setTenants(dataService.getTenants());
    setUsers(dataService.getUsers());
    setSystemStats(dataService.getSystemStatistics());
    setPendingTenants(dataService.getPendingTenants());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateTenant = () => {
    if (!newTenant.name.trim() || !newTenant.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const tenant = dataService.createTenant(
        newTenant.name,
        newTenant.description,
        currentUser.id
      );
      
      // Update tenant settings if different from defaults
      if (newTenant.maxAdmins !== 5 || newTenant.maxUsers !== 100 || 
          newTenant.maxQuizzes !== 50 || !newTenant.allowUserRegistration) {
        dataService.updateTenant(tenant.id, {
          domain: newTenant.domain || undefined,
          settings: {
            maxAdmins: newTenant.maxAdmins,
            maxUsers: newTenant.maxUsers,
            maxQuizzes: newTenant.maxQuizzes,
            allowUserRegistration: newTenant.allowUserRegistration
          }
        });
      }

      toast.success(`Tenant "${newTenant.name}" created successfully!`);
      setIsCreateTenantDialogOpen(false);
      setNewTenant({
        name: '',
        description: '',
        domain: '',
        maxAdmins: 5,
        maxUsers: 100,
        maxQuizzes: 50,
        allowUserRegistration: true
      });
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tenant');
    }
  };

  const handleCreateUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim() || !newUser.tenantId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newUser.password.length < 3) {
      toast.error('Password must be at least 3 characters long');
      return;
    }

    try {
      dataService.createUser(newUser.name, newUser.email, newUser.password, newUser.role, newUser.tenantId);
      toast.success(`User "${newUser.name}" created successfully! Default password: ${newUser.password}`);
      setIsCreateUserDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        tenantId: ''
      });
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const handleToggleTenantStatus = (tenantId: string, isActive: boolean) => {
    try {
      if (isActive) {
        dataService.deactivateTenant(tenantId);
        toast.success('Tenant deactivated');
      } else {
        dataService.activateTenant(tenantId);
        toast.success('Tenant activated');
      }
      loadData();
    } catch (error) {
      toast.error('Failed to update tenant status');
    }
  };

  const handleDeleteTenant = (tenantId: string, tenantName: string) => {
    if (window.confirm(`Are you sure you want to delete "${tenantName}"? This will permanently delete all associated data including users, quizzes, and test results. This action cannot be undone.`)) {
      try {
        dataService.deleteTenant(tenantId);
        toast.success(`Tenant "${tenantName}" deleted successfully`);
        loadData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete tenant');
      }
    }
  };

  const getTenantStats = (tenantId: string) => {
    return dataService.getTenantStatistics(tenantId);
  };

  const handleApproveTenant = (tenantId: string, tenantName: string) => {
    try {
      dataService.approveTenant(tenantId, currentUser.id);
      toast.success(`Tenant "${tenantName}" has been approved and activated!`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve tenant');
    }
  };

  const handleRejectTenant = (tenantId: string, tenantName: string) => {
    const reason = prompt(`Please provide a reason for rejecting "${tenantName}":`);
    if (reason && reason.trim()) {
      try {
        dataService.rejectTenant(tenantId, currentUser.id, reason.trim());
        toast.success(`Tenant "${tenantName}" has been rejected.`);
        loadData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to reject tenant');
      }
    }
  };

  // Tenant Approvals Section
  if (activeSection === 'approvals') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">Tenant Approvals</h2>
          <p className="text-muted-foreground">Review and approve new organization requests</p>
        </div>

        {pendingTenants.length === 0 ? (
          <Card className="border-dashed border-secondary">
            <CardContent className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success/50" />
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending tenant approval requests at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingTenants.map((tenant) => (
              <Card key={tenant.id} className="border-warning/30 bg-warning/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg text-warning">{tenant.name}</CardTitle>
                        <Badge className="bg-warning text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Approval
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{tenant.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Requested by:</span>
                          <span className="font-medium">{tenant.createdBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Submitted:</span>
                          <span className="font-medium">{formatDate(tenant.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleApproveTenant(tenant.id, tenant.name)}
                        className="bg-success hover:bg-success/90 text-white"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleRejectTenant(tenant.id, tenant.name)}
                        variant="outline"
                        size="sm"
                        className="border-danger text-danger hover:bg-danger hover:text-white"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-background/50 border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Organization Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Organization:</span>
                        <p className="font-medium">{tenant.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Domain:</span>
                        <p className="font-medium">{tenant.domain || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Admin Email:</span>
                        <p className="font-medium">{tenant.createdBy}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // System Overview Section
  if (activeSection === 'overview') {
    return (
      <div className="p-6 space-y-6">
        {/* Product Admin Header */}
        <Card className="border-warning/30 bg-gradient-to-r from-warning/10 to-warning/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center">
                <Crown className="w-8 h-8 text-warning" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-warning mb-1">Product Administration</h1>
                <p className="text-muted-foreground">Manage tenants, system-wide settings, and monitor platform health</p>
              </div>
              <Badge className="bg-warning text-white px-4 py-2">Product Admin</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals Alert */}
        {pendingTenants.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-warning">
                    {pendingTenants.length} Tenant{pendingTenants.length > 1 ? 's' : ''} Awaiting Approval
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    New organizations have requested access and need your approval
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSectionChange?.('approvals')}
                  className="border-warning text-warning hover:bg-warning hover:text-white"
                >
                  Review Requests
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tenants</p>
                  <p className="text-2xl font-semibold">{systemStats.totalTenants || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-semibold">{systemStats.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-info">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                  <p className="text-2xl font-semibold">{systemStats.totalQuizzes || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                  <p className="text-2xl font-semibold">{systemStats.totalTests || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" />
                System Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Tenants</span>
                  <span className="text-lg font-semibold text-success">
                    {systemStats.activeTenants || 0} / {systemStats.totalTenants || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Average Score</span>
                  <span className="text-lg font-semibold text-info">
                    {Math.round(systemStats.systemAverageScore || 0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Product Admins</span>
                  <span className="text-lg font-semibold text-warning">
                    {systemStats.productAdmins || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <TrendingUp className="w-5 h-5" />
                User Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tenant Admins</span>
                  <span className="text-lg font-semibold text-warning">
                    {systemStats.totalAdmins || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Students</span>
                  <span className="text-lg font-semibold text-primary">
                    {systemStats.totalStudents || 0}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-success/10 border border-success rounded-lg">
                    <div className="text-lg font-semibold text-success">
                      {Math.round((systemStats.activeTenants || 0) / Math.max(systemStats.totalTenants || 1, 1) * 100)}%
                    </div>
                    <div className="text-xs text-success">Active Rate</div>
                  </div>
                  <div className="text-center p-3 bg-info/10 border border-info rounded-lg">
                    <div className="text-lg font-semibold text-info">
                      {systemStats.totalTests ? Math.round(systemStats.totalTests / Math.max(systemStats.totalUsers || 1, 1) * 10) / 10 : 0}
                    </div>
                    <div className="text-xs text-info">Tests/User</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tenant Management Section
  if (activeSection === 'tenants') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Tenant Management</h2>
            <p className="text-muted-foreground">Create and manage organization tenants</p>
          </div>
          <Button 
            onClick={() => setIsCreateTenantDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Tenant
          </Button>
        </div>

        {/* Create Tenant Dialog */}
        <Dialog open={isCreateTenantDialogOpen} onOpenChange={setIsCreateTenantDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Tenant Name *</Label>
                <Input
                  id="tenant-name"
                  placeholder="Organization name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-description">Description *</Label>
                <Textarea
                  id="tenant-description"
                  placeholder="Brief description of the organization"
                  value={newTenant.description}
                  onChange={(e) => setNewTenant({...newTenant, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-domain">Domain (Optional)</Label>
                <Input
                  id="tenant-domain"
                  placeholder="organization.com"
                  value={newTenant.domain}
                  onChange={(e) => setNewTenant({...newTenant, domain: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Max Admins</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newTenant.maxAdmins}
                    onChange={(e) => setNewTenant({...newTenant, maxAdmins: parseInt(e.target.value) || 5})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Users</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newTenant.maxUsers}
                    onChange={(e) => setNewTenant({...newTenant, maxUsers: parseInt(e.target.value) || 100})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Quizzes</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newTenant.maxQuizzes}
                    onChange={(e) => setNewTenant({...newTenant, maxQuizzes: parseInt(e.target.value) || 50})}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-registration"
                  checked={newTenant.allowUserRegistration}
                  onCheckedChange={(checked) => setNewTenant({...newTenant, allowUserRegistration: checked})}
                />
                <Label htmlFor="allow-registration">Allow user registration</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateTenant} 
                  className="flex-1 bg-success hover:bg-success/90 text-white"
                >
                  Create Tenant
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateTenantDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tenants List */}
        <div className="grid gap-4">
          {tenants.map((tenant) => {
            const stats = getTenantStats(tenant.id);
            return (
              <Card key={tenant.id} className="border-secondary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg text-primary">{tenant.name}</CardTitle>
                        <Badge className={tenant.isActive ? "bg-success text-white" : "bg-secondary text-white"}>
                          {tenant.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {tenant.domain && (
                          <Badge variant="outline" className="border-info text-info">
                            <Globe className="w-3 h-3 mr-1" />
                            {tenant.domain}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-2">{tenant.description}</p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span>Created {formatDate(tenant.createdAt)}</span>
                        <span>{stats.totalUsers} users</span>
                        <span>{stats.totalQuizzes} quizzes</span>
                        <span>{stats.totalTests} tests</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleTenantStatus(tenant.id, tenant.isActive)}
                        className={tenant.isActive 
                          ? "border-secondary text-secondary hover:bg-secondary hover:text-white"
                          : "border-success text-success hover:bg-success hover:text-white"
                        }
                      >
                        {tenant.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                        className="border-danger text-danger hover:bg-danger hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-primary/10 border border-primary rounded-lg">
                      <div className="text-lg font-semibold text-primary">{stats.totalUsers}</div>
                      <div className="text-xs text-primary">Total Users</div>
                    </div>
                    <div className="text-center p-3 bg-warning/10 border border-warning rounded-lg">
                      <div className="text-lg font-semibold text-warning">{stats.totalAdmins}</div>
                      <div className="text-xs text-warning">Admins</div>
                    </div>
                    <div className="text-center p-3 bg-success/10 border border-success rounded-lg">
                      <div className="text-lg font-semibold text-success">{stats.publishedQuizzes}</div>
                      <div className="text-xs text-success">Published</div>
                    </div>
                    <div className="text-center p-3 bg-info/10 border border-info rounded-lg">
                      <div className="text-lg font-semibold text-info">{Math.round(stats.averageScore)}%</div>
                      <div className="text-xs text-info">Avg Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tenants.length === 0 && (
          <Card className="border-dashed border-secondary">
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No tenants created yet</h3>
              <p className="text-muted-foreground mb-4">Create your first tenant to get started</p>
              <Button 
                onClick={() => setIsCreateTenantDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Tenant
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // User Management Section
  if (activeSection === 'users') {
    const activeTenants = tenants.filter(t => t.isActive);
    
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">User Management</h2>
            <p className="text-muted-foreground">Manage users across all tenants</p>
          </div>
          <Button 
            onClick={() => setIsCreateUserDialogOpen(true)}
            disabled={activeTenants.length === 0}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>

        {activeTenants.length === 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <p className="text-warning font-medium">No active tenants available</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                You need to create and activate at least one tenant before creating users.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create User Dialog */}
        <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-tenant">Select Tenant *</Label>
                <select
                  id="user-tenant"
                  className="w-full border border-input rounded-md px-3 py-2 bg-background"
                  value={newUser.tenantId}
                  onChange={(e) => setNewUser({...newUser, tenantId: e.target.value})}
                >
                  <option value="">Select a tenant...</option>
                  {activeTenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name *</Label>
                <Input
                  id="user-name"
                  placeholder="User's full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email Address *</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password *</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Enter password (min 3 characters)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>User Role *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newUser.role === 'admin' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewUser({...newUser, role: 'admin'})}
                    className={newUser.role === 'admin' ? 'bg-warning text-white flex-1' : 'border-warning text-warning hover:bg-warning hover:text-white flex-1'}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant={newUser.role === 'user' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewUser({...newUser, role: 'user'})}
                    className={newUser.role === 'user' ? 'bg-primary text-white flex-1' : 'border-primary text-primary hover:bg-primary hover:text-white flex-1'}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Student
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateUser} 
                  className="flex-1 bg-success hover:bg-success/90 text-white"
                >
                  Create User
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateUserDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Users List */}
        <div className="space-y-4">
          {users.filter(user => user.role !== 'product-admin').map((user) => {
            const userTenant = user.tenantId ? tenants.find(t => t.id === user.tenantId) : null;
            return (
              <Card key={user.id} className="border-secondary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        user.role === 'admin' ? 'bg-warning/10' : 'bg-primary/10'
                      }`}>
                        {user.role === 'admin' ? (
                          <Settings className={`w-5 h-5 text-warning`} />
                        ) : (
                          <Users className={`w-5 h-5 text-primary`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.name}</p>
                          <Badge className={user.role === 'admin' ? "bg-warning text-white" : "bg-primary text-white"}>
                            {user.role === 'admin' ? 'Tenant Admin' : 'Student'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Joined {formatDate(user.createdAt)}</span>
                          {userTenant && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {userTenant.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {userTenant ? (
                        <Badge 
                          className={userTenant.isActive ? "bg-success text-white" : "bg-secondary text-white"}
                        >
                          {userTenant.isActive ? 'Active Tenant' : 'Inactive Tenant'}
                        </Badge>
                      ) : (
                        <Badge className="bg-danger text-white">
                          No Tenant
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // System Configuration Section
  if (activeSection === 'config') {
    return <SystemConfiguration currentUser={currentUser} />;
  }

  return <div className="p-6">Section not found</div>;
}