import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { User, UserPlus, AlertCircle, GraduationCap, Settings, Crown, Lock, Key, ChevronDown, Mail, Building } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { dataService } from './dataServiceNew';
import { User as UserType } from './types';
import { Logo } from './Logo';
import { validateBusinessEmail, getDomainSuggestions } from './emailValidator';

interface UserAuthProps {
  onUserLogin: (user: UserType) => void;
}

export function UserAuth({ onUserLogin }: UserAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    tenantName: '',
    role: 'admin' as 'admin' | 'user'
  });
  const [emailValidation, setEmailValidation] = useState<{ isValid: boolean; error?: string; suggestion?: string } | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [selectedDemoUser, setSelectedDemoUser] = useState<string>('');

  useEffect(() => {
    // Load available demo users
    const users = dataService.getUsers();
    setAvailableUsers(users);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    if (isLogin) {
      // Login
      const user = dataService.loginUser(formData.email, formData.password);
      if (user) {
        toast.success(`Welcome back, ${user.name}!`);
        onUserLogin(user);
      } else {
        toast.error('Invalid email or password. Please check your credentials.');
      }
    } else {
      // Register
      if (!formData.name.trim()) {
        toast.error('Please enter your name');
        return;
      }

      if (!formData.email.trim()) {
        toast.error('Please enter your email address');
        return;
      }

      // Validate business email
      const emailValidationResult = validateBusinessEmail(formData.email);
      if (!emailValidationResult.isValid) {
        toast.error(emailValidationResult.error || 'Invalid email address');
        setEmailValidation(emailValidationResult);
        return;
      }

      if (!formData.tenantName.trim()) {
        toast.error('Please enter your organization name');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (formData.password.length < 3) {
        toast.error('Password must be at least 3 characters long');
        return;
      }

      try {
        const result = dataService.createTenantAndAdmin(
          formData.name, 
          formData.email, 
          formData.password, 
          formData.tenantName
        );
        
        toast.success(`Registration submitted successfully! Your tenant "${formData.tenantName}" is pending approval from a product administrator.`);
        
        // Reset form
        setFormData({ name: '', email: '', password: '', confirmPassword: '', tenantName: '', role: 'admin' });
        setEmailValidation(null);
        setIsLogin(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create account');
      }
    }
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 3) {
      toast.error('Password must be at least 3 characters long');
      return;
    }

    const success = dataService.resetPassword(resetEmail, newPassword);
    if (success) {
      toast.success('Password reset successfully! You can now sign in with your new password.');
      setShowResetPassword(false);
      setResetEmail('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      toast.error('User not found with this email address.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear email validation when email changes
    if (field === 'email') {
      setEmailValidation(null);
      
      // Validate email in real-time for better UX
      if (value.trim() && !isLogin) {
        const validation = validateBusinessEmail(value);
        setEmailValidation(validation);
      }
    }
  };

  const handleDemoUserSelect = (userEmail: string) => {
    if (userEmail) {
      const selectedUser = availableUsers.find(u => u.email === userEmail);
      if (selectedUser) {
        setFormData(prev => ({
          ...prev,
          email: userEmail,
          password: 'wel123'
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        email: '',
        password: ''
      }));
    }
    setSelectedDemoUser(userEmail);
  };

  const getUserRoleDisplay = (role: string) => {
    switch (role) {
      case 'product-admin':
        return { label: 'Product Admin', icon: Crown, color: 'text-warning' };
      case 'admin':
        return { label: 'Admin', icon: Settings, color: 'text-info' };
      case 'user':
        return { label: 'Student', icon: GraduationCap, color: 'text-primary' };
      default:
        return { label: 'User', icon: User, color: 'text-secondary' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <Logo variant="large" className="justify-center" />
        </div>

        <Card className="shadow-lg border-0 shadow-primary/10">
          <CardContent className="pt-6">
            <Tabs value={isLogin ? "signin" : "signup"} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="signin" 
                  onClick={() => setIsLogin(true)}
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  onClick={() => setIsLogin(false)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                {!showResetPassword ? (
                  <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Demo Account Dropdown */}
                      <div className="space-y-2">
                        <Label htmlFor="demo-select">Demo Account (Optional)</Label>
                        <div className="relative">
                          <select
                            id="demo-select"
                            className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground appearance-none cursor-pointer"
                            value={selectedDemoUser}
                            onChange={(e) => handleDemoUserSelect(e.target.value)}
                          >
                            <option value="">Select a demo account...</option>
                            {availableUsers.map((user) => {
                              const roleInfo = getUserRoleDisplay(user.role);
                              return (
                                <option key={user.id} value={user.email}>
                                  {user.name} - {roleInfo.label} ({user.email})
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {selectedDemoUser && (
                          <div className="text-xs text-muted-foreground">
                            Demo password: <code className="bg-muted px-1 rounded">wel123</code>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="border-input focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className="border-input focus:border-primary"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        Sign In
                      </Button>
                    </form>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResetPassword(true)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Forgot Password?
                      </Button>
                    </div>

                    {availableUsers.length > 0 && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-primary">Demo Accounts Available</p>
                            <p className="text-sm text-muted-foreground">
                              Use the dropdown above to quickly select a demo account. All demo accounts use password: <code className="bg-background px-1 rounded">wel123</code>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center pb-2">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Key className="w-5 h-5 text-warning" />
                        <h3 className="font-medium">Reset Password</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Enter your email and new password</p>
                    </div>
                    
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email Address</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="border-input focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="border-input focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="border-input focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowResetPassword(false);
                            setResetEmail('');
                            setNewPassword('');
                            setConfirmNewPassword('');
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 bg-warning hover:bg-warning/90"
                        >
                          Reset Password
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="border-input focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Business Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.name@company.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`pl-10 border-input focus:border-primary ${
                          emailValidation && !emailValidation.isValid ? 'border-danger' : ''
                        } ${
                          emailValidation && emailValidation.isValid ? 'border-success' : ''
                        }`}
                      />
                    </div>
                    {emailValidation && !emailValidation.isValid && (
                      <div className="space-y-1">
                        <p className="text-sm text-danger flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {emailValidation.error}
                        </p>
                        {emailValidation.suggestion && (
                          <p className="text-xs text-muted-foreground">
                            💡 {emailValidation.suggestion}
                          </p>
                        )}
                      </div>
                    )}
                    {emailValidation && emailValidation.isValid && (
                      <p className="text-sm text-success flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        Business email verified
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant-name">Organization Name</Label>
                    <Input
                      id="tenant-name"
                      type="text"
                      placeholder="Enter your organization name"
                      value={formData.tenantName}
                      onChange={(e) => handleInputChange('tenantName', e.target.value)}
                      className="border-input focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Enter your password (min 3 characters)"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="border-input focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="border-input focus:border-primary"
                    />
                  </div>



                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <Settings className="w-4 h-4 mt-0.5 text-warning flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-warning">Business Registration Required</p>
                        <p className="text-sm text-muted-foreground">
                          You're creating a new organization (tenant) with yourself as the admin. Only business email addresses are accepted. This registration requires approval from a product administrator before you can access the system.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-info/10 border border-info/20 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 mt-0.5 text-info flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-info">Business Email Only</p>
                        <p className="text-sm text-muted-foreground">
                          Personal email addresses (Gmail, Yahoo, Hotmail, etc.) are not allowed. Please use your organization's official email address.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={emailValidation && !emailValidation.isValid}
                    className="w-full bg-warning hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Demo Reset Section */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dataService.resetDemoData();
                    setAvailableUsers(dataService.getUsers());
                    toast.success('Demo data reset! Fresh accounts available.');
                  }}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  🔄 Reset Demo Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>© 2024 ProQuiz. Knowledge Assessment Platform.</p>
        </div>
      </div>
    </div>
  );
}