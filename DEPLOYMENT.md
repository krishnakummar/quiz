# ProQuiz Application Deployment Guide

This guide covers multiple deployment scenarios for the ProQuiz application, from simple frontend-only deployments to full production setups with MySQL database.

## 📋 Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed locally
- Modern web browser for testing
- Domain name (for production deployment)
- Cloud provider account (AWS, Vercel, etc.)

## 🚀 Deployment Options

### Option 1: Frontend-Only Deployment (localStorage)

This is the simplest deployment option, perfect for demos, testing, or small-scale usage.

#### Supported Platforms:
- **Vercel** (Recommended for React apps)
- **Netlify** 
- **AWS S3 + CloudFront**
- **GitHub Pages**
- **Any static hosting service**

#### Steps for Vercel Deployment:

1. **Prepare the Project**
   ```bash
   # Install dependencies
   npm install

   # Build the application
   npm run build

   # Test the build locally
   npm run preview
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login to Vercel
   vercel login

   # Deploy the project
   vercel --prod
   ```

   Or use the Vercel dashboard:
   - Connect your GitHub repository
   - Import the project
   - Configure build settings:
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Environment Configuration**
   
   Create a `vercel.json` file:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

#### Steps for Netlify Deployment:

1. **Build Configuration**
   
   Create a `netlify.toml` file:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy via Netlify Dashboard**
   - Connect your Git repository
   - Configure build settings as above
   - Deploy

### Option 2: Full Production Deployment (with MySQL)

This setup provides enterprise-grade features with persistent database storage.

#### Architecture Overview:
```
[Frontend (React)] → [Backend API (Node.js/Express)] → [MySQL Database]
                           ↓
                    [Redis Cache (Optional)]
```

#### Backend Implementation

Create the backend API server using the provided specification in `/api-examples/backend-endpoints.md`.

**Example using Express.js and MySQL:**

1. **Create Backend Project**
   ```bash
   mkdir proquiz-backend
   cd proquiz-backend
   npm init -y

   # Install dependencies
   npm install express mysql2 bcryptjs jsonwebtoken cors helmet dotenv
   npm install -D @types/node typescript ts-node nodemon
   ```

2. **Backend Structure**
   ```
   proquiz-backend/
   ├── src/
   │   ├── controllers/
   │   ├── middleware/
   │   ├── models/
   │   ├── routes/
   │   └── app.ts
   ├── .env
   └── package.json
   ```

3. **Environment Variables (.env)**
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=proquiz_db
   DB_USER=your_username
   DB_PASSWORD=your_password

   # Application
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your_jwt_secret_key

   # CORS
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ```

4. **Database Setup**
   ```sql
   -- Create database
   CREATE DATABASE proquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

   -- Use the provided schema from /components/mysqlService.ts
   -- Copy and execute the MYSQL_SCHEMA_SQL content
   ```

#### Deployment Options:

##### Option A: AWS Deployment

**Frontend (S3 + CloudFront):**
1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://proquiz-app --region us-east-1
   aws s3 website s3://proquiz-app --index-document index.html --error-document index.html
   ```

2. **Deploy Frontend**
   ```bash
   npm run build
   aws s3 sync dist/ s3://proquiz-app --delete
   ```

3. **Setup CloudFront Distribution**
   - Create CloudFront distribution pointing to S3 bucket
   - Configure custom error pages (404 → /index.html)
   - Add SSL certificate

**Backend (EC2 + RDS):**
1. **Launch RDS MySQL Instance**
   - Choose appropriate instance size
   - Configure security groups
   - Set up automated backups

2. **Deploy Backend to EC2**
   ```bash
   # On EC2 instance
   git clone your-backend-repo
   cd proquiz-backend
   npm install
   npm run build
   pm2 start dist/app.js --name proquiz-api
   ```

3. **Configure Load Balancer**
   - Application Load Balancer
   - SSL termination
   - Health checks

##### Option B: Heroku Deployment

**Backend:**
```bash
# In your backend directory
git init
heroku create proquiz-backend

# Add database
heroku addons:create cleardb:ignite

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret

# Deploy
git add .
git commit -m "Initial deploy"
git push heroku main
```

**Frontend:**
Deploy to Vercel/Netlify with backend API URL configured.

##### Option C: Docker Deployment

**Dockerfile (Backend):**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=mysql
      - DB_NAME=proquiz_db
      - DB_USER=root
      - DB_PASSWORD=password
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: proquiz_db
    volumes:
      - mysql_data:/var/lib/mysql
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"

volumes:
  mysql_data:
```

## 🔧 Configuration

### Frontend Configuration

Update the MySQL service configuration in production:

```typescript
// In components/mysqlService.ts - modify the makeAPICall method
private async makeAPICall(endpoint: string, options: RequestInit = {}): Promise<any> {
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-api-domain.com' 
    : 'http://localhost:3001';
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
```

### Build Optimization

**Vite Configuration (vite.config.ts):**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'sonner'],
        },
      },
    },
    sourcemap: false,
    minify: 'terser',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
})
```

**Package.json Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:production": "NODE_ENV=production npm run build",
    "preview": "vite preview",
    "deploy": "npm run build:production && vercel --prod"
  }
}
```

## 🔐 Security Configuration

### Environment Variables

**Frontend (.env.production):**
```env
VITE_API_URL=https://your-api-domain.com
VITE_APP_ENVIRONMENT=production
```

**Backend Security Headers:**
```typescript
// Express.js security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
```

### Database Security

1. **Use SSL connections**
2. **Restrict database access to application servers only**
3. **Regular security updates**
4. **Backup and recovery procedures**

## 📊 Monitoring & Analytics

### Application Monitoring

1. **Frontend Analytics**
   - Google Analytics
   - Vercel Analytics
   - User session recording

2. **Backend Monitoring**
   - Application Performance Monitoring (APM)
   - Error tracking (Sentry)
   - Database performance monitoring

3. **Infrastructure Monitoring**
   - AWS CloudWatch
   - Server metrics
   - Database metrics

### Health Checks

**Backend Health Endpoint:**
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: 'connected', // Check actual DB connection
  });
});
```

## 🚢 Deployment Checklist

### Pre-Deployment:
- [ ] All tests pass
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Security headers implemented
- [ ] Performance optimizations applied
- [ ] Backup procedures tested

### Post-Deployment:
- [ ] Health checks passing
- [ ] SSL certificates working
- [ ] Database connections stable
- [ ] User authentication working
- [ ] Email notifications working (if implemented)
- [ ] Performance monitoring active

## 🔄 CI/CD Pipeline

### GitHub Actions Example:

```yaml
name: Deploy ProQuiz

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build:production
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 💡 Performance Optimization

1. **Frontend Optimization**
   - Code splitting by routes
   - Lazy loading components
   - Image optimization
   - PWA capabilities

2. **Backend Optimization**
   - Database connection pooling
   - Redis caching layer
   - API response compression
   - Rate limiting

3. **Database Optimization**
   - Proper indexing
   - Query optimization
   - Regular maintenance

## 🆘 Troubleshooting

### Common Issues:

1. **Database Connection Issues**
   - Check firewall rules
   - Verify credentials
   - Test network connectivity

2. **CORS Errors**
   - Configure allowed origins
   - Check preflight requests

3. **Build Failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility

### Support Resources:
- Application logs
- Database query logs
- Network monitoring tools
- Error tracking systems

## 📞 Production Support

For production deployments, ensure you have:
- Monitoring and alerting setup
- Backup and recovery procedures
- Incident response plan
- Regular security audits
- Performance optimization reviews

This deployment guide provides a solid foundation for deploying ProQuiz in various environments, from simple demos to enterprise-grade production systems.