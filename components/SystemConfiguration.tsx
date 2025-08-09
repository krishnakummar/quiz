import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Database, 
  Settings, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Upload,
  Download,
  Server,
  HardDrive,
  Clock,
  Users,
  FileText,
  Trophy,
  Zap,
  Shield
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { mysqlService, MySQLConfig, ConnectionStatus, MYSQL_SCHEMA_SQL } from './mysqlService';
import { databaseService } from './databaseServiceFixed';

interface SystemConfigurationProps {
  currentUser: any;
}

export function SystemConfiguration({ currentUser }: SystemConfigurationProps) {
  const [activeTab, setActiveTab] = useState('database');
  const [mysqlConfig, setMySqlConfig] = useState<MySQLConfig>({
    host: 'localhost',
    port: 3306,
    database: 'proquiz_db',
    username: '',
    password: '',
    ssl: false,
    connectionTimeout: 60000,
    acquireTimeout: 60000,
    timezone: 'UTC'
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isInitializingSchema, setIsInitializingSchema] = useState(false);
  const [isMigratingData, setIsMigratingData] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [useMySQL, setUseMySQL] = useState(false);

  useEffect(() => {
    loadCurrentConfig();
    checkDatabaseHealth();
  }, []);

  const loadCurrentConfig = () => {
    const config = mysqlService.getConfig();
    if (config) {
      setMySqlConfig(config);
      setUseMySQL(true);
    }
    
    const status = mysqlService.getConnectionStatus();
    setConnectionStatus(status);
  };

  const handleConfigChange = (field: keyof MySQLConfig, value: string | number | boolean) => {
    setMySqlConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const status = await mysqlService.testConnection(mysqlConfig);
      setConnectionStatus(status);
      
      if (status.connected) {
        toast.success(`Database connection successful! Server version: ${status.serverVersion}`);
      } else {
        toast.error(`Connection failed: ${status.error}`);
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveConfiguration = async () => {
    mysqlService.setConfig(mysqlConfig);
    
    // Save to localStorage for persistence
    localStorage.setItem('mysql_config', JSON.stringify(mysqlConfig));
    localStorage.setItem('use_mysql', useMySQL.toString());
    
    toast.success('Database configuration saved successfully');
    
    if (useMySQL && connectionStatus.connected) {
      checkDatabaseHealth();
    }
  };

  const initializeSchema = async () => {
    if (!connectionStatus.connected) {
      toast.error('Database connection required to initialize schema');
      return;
    }

    setIsInitializingSchema(true);
    try {
      const result = await mysqlService.initializeSchema();
      
      if (result.success) {
        toast.success('Database schema initialized successfully');
        checkDatabaseHealth();
      } else {
        toast.error(`Schema initialization failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Schema initialization failed');
    } finally {
      setIsInitializingSchema(false);
    }
  };

  const migrateData = async () => {
    if (!connectionStatus.connected) {
      toast.error('Database connection required for data migration');
      return;
    }

    setIsMigratingData(true);
    setMigrationProgress(0);

    try {
      // Get data from localStorage service
      const localData = databaseService.exportDatabase();
      
      // Simulate migration progress
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await mysqlService.migrateFromLocalStorage(JSON.parse(localData));
      
      clearInterval(progressInterval);
      setMigrationProgress(100);

      if (result.success) {
        toast.success(`Data migration completed successfully! Migrated: ${JSON.stringify(result.migratedCounts)}`);
        checkDatabaseHealth();
      } else {
        toast.error(`Data migration failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Data migration failed');
    } finally {
      setIsMigratingData(false);
      setMigrationProgress(0);
    }
  };

  const checkDatabaseHealth = async () => {
    if (!connectionStatus.connected) return;

    try {
      const health = await mysqlService.getDatabaseHealth();
      setDbHealth(health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const downloadSchema = () => {
    const blob = new Blob([MYSQL_SCHEMA_SQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'proquiz-mysql-schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('MySQL schema file downloaded');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">System Configuration</h2>
        <p className="text-muted-foreground">Configure database connections and system settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="migration" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Migration
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Health
          </TabsTrigger>
        </TabsList>

        {/* Database Configuration Tab */}
        <TabsContent value="database" className="space-y-6">
          {/* Current Database Status */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Server className="w-5 h-5" />
                Database Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-light border border-secondary rounded-lg">
                <div>
                  <p className="font-medium">Current Database Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {useMySQL && connectionStatus.connected ? 'MySQL Database (Connected)' : 'localStorage (Local Storage)'}
                  </p>
                </div>
                <Badge className={useMySQL && connectionStatus.connected ? 'bg-success text-white' : 'bg-secondary text-white'}>
                  {useMySQL && connectionStatus.connected ? 'Production Ready' : 'Development Mode'}
                </Badge>
              </div>

              {/* Enable MySQL Toggle */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium">Enable MySQL Database</p>
                  <p className="text-sm text-muted-foreground">
                    Switch from localStorage to MySQL for production deployment
                  </p>
                </div>
                <Switch
                  checked={useMySQL}
                  onCheckedChange={setUseMySQL}
                />
              </div>

              {useMySQL && (
                <>
                  {/* MySQL Connection Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="host">Host *</Label>
                      <Input
                        id="host"
                        value={mysqlConfig.host}
                        onChange={(e) => handleConfigChange('host', e.target.value)}
                        placeholder="localhost or IP address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="port">Port *</Label>
                      <Input
                        id="port"
                        type="number"
                        value={mysqlConfig.port}
                        onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 3306)}
                        placeholder="3306"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="database">Database *</Label>
                      <Input
                        id="database"
                        value={mysqlConfig.database}
                        onChange={(e) => handleConfigChange('database', e.target.value)}
                        placeholder="proquiz_db"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        value={mysqlConfig.username}
                        onChange={(e) => handleConfigChange('username', e.target.value)}
                        placeholder="Database username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={mysqlConfig.password}
                        onChange={(e) => handleConfigChange('password', e.target.value)}
                        placeholder="Database password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={mysqlConfig.timezone}
                        onChange={(e) => handleConfigChange('timezone', e.target.value)}
                        placeholder="UTC"
                      />
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium">Advanced Settings</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="connectionTimeout">Connection Timeout (ms)</Label>
                        <Input
                          id="connectionTimeout"
                          type="number"
                          value={mysqlConfig.connectionTimeout}
                          onChange={(e) => handleConfigChange('connectionTimeout', parseInt(e.target.value) || 60000)}
                          placeholder="60000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="acquireTimeout">Acquire Timeout (ms)</Label>
                        <Input
                          id="acquireTimeout"
                          type="number"
                          value={mysqlConfig.acquireTimeout}
                          onChange={(e) => handleConfigChange('acquireTimeout', parseInt(e.target.value) || 60000)}
                          placeholder="60000"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">Enable SSL</p>
                        <p className="text-sm text-muted-foreground">Use SSL/TLS encryption for database connections</p>
                      </div>
                      <Switch
                        checked={mysqlConfig.ssl}
                        onCheckedChange={(checked) => handleConfigChange('ssl', checked)}
                      />
                    </div>
                  </div>

                  {/* Connection Status */}
                  {connectionStatus && (
                    <Alert className={connectionStatus.connected ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'}>
                      <div className="flex items-center gap-2">
                        {connectionStatus.connected ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-danger" />
                        )}
                        <AlertDescription>
                          {connectionStatus.connected ? (
                            <span className="text-success">
                              Connected to MySQL {connectionStatus.serverVersion} 
                              {connectionStatus.connectionTime && ` (${connectionStatus.connectionTime}ms)`}
                            </span>
                          ) : (
                            <span className="text-danger">
                              {connectionStatus.error || 'Not connected to database'}
                            </span>
                          )}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={testConnection}
                      disabled={isTestingConnection}
                      className="bg-info hover:bg-info/90 text-white"
                    >
                      {isTestingConnection ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Test Connection
                    </Button>

                    <Button
                      onClick={saveConfiguration}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Save Configuration
                    </Button>

                    <Button
                      onClick={downloadSchema}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Schema
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Migration Tab */}
        <TabsContent value="migration" className="space-y-6">
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Upload className="w-5 h-5" />
                Data Migration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!useMySQL || !connectionStatus.connected ? (
                <Alert className="border-warning/30 bg-warning/5">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <AlertDescription className="text-warning">
                    MySQL database connection is required for data migration. Please configure and test your database connection first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-light border border-secondary rounded-lg">
                      <h4 className="font-medium mb-2">Migration Process</h4>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>1. Initialize MySQL database schema</p>
                        <p>2. Export data from localStorage</p>
                        <p>3. Transform and import data to MySQL</p>
                        <p>4. Verify data integrity</p>
                      </div>
                    </div>

                    {isMigratingData && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Migration Progress</span>
                          <span className="text-sm text-muted-foreground">{migrationProgress}%</span>
                        </div>
                        <Progress value={migrationProgress} className="h-2" />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={initializeSchema}
                        disabled={isInitializingSchema || isMigratingData}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        {isInitializingSchema ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Database className="w-4 h-4 mr-2" />
                        )}
                        Initialize Schema
                      </Button>

                      <Button
                        onClick={migrateData}
                        disabled={isMigratingData || isInitializingSchema}
                        className="bg-warning hover:bg-warning/90 text-white"
                      >
                        {isMigratingData ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Migrate Data
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <Card className="border-success/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <Shield className="w-5 h-5" />
                Database Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!useMySQL || !connectionStatus.connected ? (
                <Alert className="border-info/30 bg-info/5">
                  <Database className="w-4 h-4 text-info" />
                  <AlertDescription className="text-info">
                    Currently using localStorage for data storage. Connect to MySQL to see database health metrics.
                  </AlertDescription>
                </Alert>
              ) : dbHealth ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <div className="text-2xl font-semibold text-primary">{dbHealth.stats?.totalUsers || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Users</div>
                      </CardContent>
                    </Card>

                    <Card className="border-info/20 bg-info/5">
                      <CardContent className="p-4 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-info" />
                        <div className="text-2xl font-semibold text-info">{dbHealth.stats?.totalQuizzes || 0}</div>
                        <div className="text-sm text-muted-foreground">Quiz Sets</div>
                      </CardContent>
                    </Card>

                    <Card className="border-success/20 bg-success/5">
                      <CardContent className="p-4 text-center">
                        <Trophy className="w-8 h-8 mx-auto mb-2 text-success" />
                        <div className="text-2xl font-semibold text-success">{dbHealth.stats?.totalAttempts || 0}</div>
                        <div className="text-sm text-muted-foreground">Test Attempts</div>
                      </CardContent>
                    </Card>

                    <Card className="border-warning/20 bg-warning/5">
                      <CardContent className="p-4 text-center">
                        <HardDrive className="w-8 h-8 mx-auto mb-2 text-warning" />
                        <div className="text-2xl font-semibold text-warning">{dbHealth.stats?.databaseSize || '0 MB'}</div>
                        <div className="text-sm text-muted-foreground">Database Size</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-light border border-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Database Uptime</p>
                        <p className="text-sm text-muted-foreground">Server running time</p>
                      </div>
                    </div>
                    <div className="text-lg font-semibold">{dbHealth.stats?.uptime || '0h 0m'}</div>
                  </div>

                  <Button
                    onClick={checkDatabaseHealth}
                    variant="outline"
                    className="border-success text-success hover:bg-success hover:text-white"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Refresh Health Status
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading database health information...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}