# ProQuiz MySQL Backend API Endpoints

This document outlines the required backend API endpoints for MySQL database integration with the ProQuiz frontend application.

## Base Configuration

- **Base URL**: Configure in frontend system settings
- **Authentication**: Use JWT tokens or session-based auth
- **Content-Type**: `application/json`
- **Database**: MySQL 8.0+ recommended

## Database Connection Endpoints

### POST `/api/db/test-connection`

Test MySQL database connection with provided configuration.

**Request Body:**

```json
{
  "host": "localhost",
  "port": 3306,
  "database": "proquiz_db",
  "username": "admin",
  "password": "password",
  "ssl": false,
  "connectionTimeout": 60000,
  "acquireTimeout": 60000,
  "timezone": "UTC"
}
```

**Response:**

```json
{
  "success": true,
  "serverVersion": "8.0.35",
  "message": "Connection successful"
}
```

### POST `/api/db/initialize-schema`

Create database tables and initial configuration.

**Request Body:**

```json
{
  "config": { /* MySQL config object */ }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Database schema initialized successfully",
  "tablesCreated": [
    "tenants", "users", "quiz_sets", "quiz_questions",
    "user_attempts", "attempt_answers", "user_sessions", "system_config"
  ]
}
```

### POST `/api/db/migrate-data`

Migrate data from localStorage to MySQL.

**Request Body:**

```json
{
  "config": { /* MySQL config */ },
  "data": { /* Complete localStorage database export */ }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Data migration completed successfully",
  "migratedCounts": {
    "tenants": 3,
    "users": 15,
    "quizSets": 8,
    "questions": 45,
    "attempts": 127,
    "answers": 634
  }
}
```

### GET `/api/db/health`

Get database health status and statistics.

**Response:**

```json
{
  "healthy": true,
  "stats": {
    "totalTenants": 12,
    "totalUsers": 156,
    "totalQuizzes": 23,
    "totalAttempts": 1247,
    "databaseSize": "15.7 MB",
    "uptime": "72h 34m"
  }
}
```

## Tenant Management

### GET `/api/tenants`

Get all tenants (filtered by permissions).

### POST `/api/tenants`

Create a new tenant.

**Request Body:**

```json
{
  "id": "tenant_123",
  "name": "Acme Corporation",
  "description": "Technology company",
  "status": "pending",
  "isActive": false,
  "createdBy": "admin@acme.com",
  "settings": {
    "maxAdmins": 5,
    "maxUsers": 100,
    "maxQuizzes": 50,
    "allowUserRegistration": true
  }
}
```

### PUT `/api/tenants/:id`

Update tenant information.

### DELETE `/api/tenants/:id`

Delete a tenant (cascade delete all related data).

## User Management

### GET `/api/users`

Get all users (with tenant filtering).

### POST `/api/users`

Create a new user.

**Request Body:**

```json
{
  "id": "user_456",
  "name": "John Doe",
  "email": "john@acme.com",
  "password": "securepassword",
  "role": "admin",
  "tenantId": "tenant_123",
  "status": "active"
}
```

### PUT `/api/users/:id`

Update user information.

### DELETE `/api/users/:id`

Delete a user.

### POST `/api/auth/login`

User authentication.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_456",
    "name": "John Doe",
    "email": "john@acme.com",
    "role": "admin",
    "tenantId": "tenant_123",
    "status": "active"
  },
  "token": "jwt_token_here"
}
```

## Quiz Management

### GET `/api/quiz-sets`

Get quiz sets (with tenant filtering).

### POST `/api/quiz-sets`

Create a new quiz set.

### PUT `/api/quiz-sets/:id`

Update quiz set.

### DELETE `/api/quiz-sets/:id`

Delete quiz set (cascade delete questions).

### GET `/api/quiz-sets/:id/questions`

Get questions for a quiz set.

### POST `/api/quiz-sets/:id/questions`

Add questions to a quiz set.

## Test Results

### GET `/api/test-results`

Get test results (with filtering).

### POST `/api/test-results`

Save a test result.

**Request Body:**

```json
{
  "userId": "user_456",
  "tenantId": "tenant_123",
  "quizSetId": "quiz_789",
  "score": 8,
  "totalQuestions": 10,
  "percentage": 80,
  "timeRemaining": 120,
  "timeTaken": 780,
  "completedAt": "2024-01-15T10:30:00Z",
  "quizType": "custom",
  "answers": [/* detailed answers */]
}
```

## Implementation Notes

### Database Schema

Use the provided MySQL schema from `MYSQL_SCHEMA_SQL` in the `mysqlService.ts` file.

### Security Considerations

1. Use parameterized queries to prevent SQL injection
2. Implement proper authentication and authorization
3. Validate all input data
4. Use HTTPS for all communications
5. Hash passwords using bcrypt or similar

### Performance Optimization

1. Use connection pooling
2. Implement proper indexes (already defined in schema)
3. Use transactions for data consistency
4. Implement caching where appropriate

### Error Handling

Return consistent error responses:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "code": "ERROR_CODE"
}
```

### Multi-tenancy

- Always filter data by tenant ID for non-product-admin users
- Product admins can access cross-tenant data
- Implement proper tenant isolation in all queries

### Migration Strategy

1. Keep localStorage as fallback
2. Implement gradual migration capability
3. Provide rollback mechanisms
4. Test migration with sample data first

This API structure ensures seamless integration between the ProQuiz frontend and a MySQL backend while maintaining security, performance, and multi-tenant isolation.