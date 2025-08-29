import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { DatabaseService } from './utils/database';
import { redisHealthCheck, shutdownRedis } from './utils/redis';
import { SocketService } from './sockets/socketService';
import { AnalysisWorker } from './jobs/analysisWorker';

// Import routes
import authRoutes from './routes/auth';
import childrenRoutes from './routes/children';
import sessionsRoutes from './routes/sessions';
import assessmentsRoutes from './routes/assessments';
import scenariosRoutes from './routes/scenarios';
import analysisRoutes from './routes/analysis';
import mediaRoutes from './routes/media';
import therapistRoutes from './routes/therapist';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize services
let analysisWorker: AnalysisWorker;
let socketService: SocketService;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chirp API',
      version: '1.0.0',
      description: 'Backend API for Chirp - Conversation Training App for Autistic Kids',
      contact: {
        name: 'Chirp Team',
        email: 'support@chirpapp.com',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.chirpapp.com' 
          : `http://localhost:${PORT}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['KID', 'PARENT', 'THERAPIST', 'ADMIN'] },
            displayName: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Swagger UI
}));

app.use(compression());

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: false,
      redis: false,
      storage: true, // Assume S3 is available
    },
  };

  try {
    // Check database
    health.services.database = await DatabaseService.healthCheck();
    
    // Check Redis
    health.services.redis = await redisHealthCheck();

    const allServicesHealthy = Object.values(health.services).every(service => service === true);
    
    res.status(allServicesHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    health.status = 'error';
    res.status(503).json(health);
  }
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Chirp API Documentation',
}));

// Serve swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/auth', authRoutes);
app.use('/children', childrenRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/assessments', assessmentsRoutes);
app.use('/scenarios', scenariosRoutes);
app.use('/analysis', analysisRoutes);
app.use('/media', mediaRoutes);
app.use('/therapist', therapistRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Chirp API',
    version: '1.0.0',
    description: 'Backend API for Chirp - Conversation Training App for Autistic Kids',
    documentation: '/api-docs',
    health: '/health',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      details: 'Maximum file size is 100MB',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      details: 'Only single file upload is supported',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details,
    });
  }

  // Database errors
  if (err.code === 'P2002') { // Prisma unique constraint
    return res.status(409).json({
      error: 'Duplicate entry',
      details: 'A record with this information already exists',
    });
  }

  if (err.code === 'P2025') { // Prisma record not found
    return res.status(404).json({
      error: 'Record not found',
      details: 'The requested resource does not exist',
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message, stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    details: `The endpoint ${req.method} ${req.path} does not exist`,
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize database connection
    logger.info('Connecting to database...');
    await DatabaseService.healthCheck();
    logger.info('Database connected successfully');

    // Initialize Redis connection
    logger.info('Connecting to Redis...');
    const redisConnected = await redisHealthCheck();
    if (redisConnected) {
      logger.info('Redis connected successfully');
    } else {
      logger.warn('Redis connection failed - some features may not work');
    }

    // Initialize Socket.IO
    socketService = SocketService.getInstance(server);
    logger.info('Socket.IO initialized');

    // Initialize analysis worker
    analysisWorker = new AnalysisWorker();
    logger.info('Analysis worker started');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`Health Check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close analysis worker
      if (analysisWorker) {
        await analysisWorker.close();
        logger.info('Analysis worker closed');
      }

      // Close Socket.IO connections
      if (socketService) {
        await socketService.disconnectAll();
        logger.info('Socket.IO connections closed');
      }

      // Close Redis connections
      await shutdownRedis();

      // Close database connections
      await DatabaseService.disconnect();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);

  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();