import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';

import config from './config/index.js';
import { connectDB } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger, correlationIdMiddleware, requestLogger } from './config/logger.js';
import { ioRedis, closeRedisConnections } from './config/redis.js';
import { swaggerSpec } from './config/swagger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { initializeQueues, closeQueues } from './jobs/queues.js';
import { startNotificationWorker, stopNotificationWorker } from './jobs/workers/notificationWorker.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import pageRoutes from './routes/page.js';
import postRoutes from './routes/post.js';
import membershipRoutes from './routes/membership.js';
import conversationRoutes from './routes/conversation.js';
import notificationRoutes from './routes/notification.js';
import uploadRoutes from './routes/upload.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';

// Import socket handlers
import { initializeSockets } from './sockets/index.js';

const app: Application = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: config.clientUrl,
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Make io accessible to routes
app.set('io', io);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Core middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Support comma-separated URLs in CLIENT_URL
        const allowedOrigins = config.clientUrl.split(',').map(url => url.trim());

        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(correlationIdMiddleware);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookie.secret));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Patreon MVP API Docs',
}));

// Health check (no rate limiting)
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        },
    });
});

// Home route to verify server is running
// Home route to verify server is running and show config
app.get('/home', (_req: Request, res: Response) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
        message: 'Server is online!',
        env: config.env,
        clientUrl: config.clientUrl,
        database: {
            status: mongoStatus
        },
        cors: {
            allowedOrigin: config.clientUrl
        }
    });
});

// Readiness check (checks DB and Redis)
app.get('/api/ready', async (_req: Request, res: Response) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = config.redis.ioRedisUrl && ioRedis ? ioRedis.status === 'ready' : true;

    const ready = mongoReady && redisReady;

    res.status(ready ? 200 : 503).json({
        success: ready,
        data: {
            status: ready ? 'ready' : 'not ready',
            services: {
                mongodb: mongoReady ? 'connected' : 'disconnected',
                redis: redisReady ? 'connected' : 'disconnected',
            },
        },
    });
});

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found',
        },
    });
});

// Error handler
app.use(errorHandler);

// Initialize socket handlers
initializeSockets(io);

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, starting graceful shutdown...`);

    // Stop accepting new connections
    httpServer.close(() => {
        logger.info('HTTP server closed');
    });

    // Close Socket.io connections
    io.close(() => {
        logger.info('Socket.io connections closed');
    });

    try {
        // Stop background workers
        await stopNotificationWorker();

        // Close job queues
        await closeQueues();

        // Close Redis connections
        await closeRedisConnections();

        // Close MongoDB connection
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');

        logger.info('Graceful shutdown complete');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown', { error });
        process.exit(1);
    }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled rejection', { reason });
});

// Start server
const startServer = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await connectDB();
        logger.info('MongoDB connected');

        // Connect Redis for IORedis (if configured)
        if (config.redis.ioRedisUrl && ioRedis) {
            try {
                await ioRedis.connect();
                logger.info('Redis connected');

                // Setup Socket.io Redis adapter for horizontal scaling
                const pubClient = ioRedis.duplicate();
                const subClient = ioRedis.duplicate();
                io.adapter(createAdapter(pubClient, subClient));
                logger.info('Socket.io Redis adapter configured');
            } catch (redisError) {
                logger.warn('Redis connection failed, running without Redis', { error: redisError });
            }
        }

        // Initialize BullMQ queues
        initializeQueues();

        // Start background workers
        startNotificationWorker(io);

        // Start HTTP server
        httpServer.listen(config.port, () => {
            logger.info(`Server running on port ${config.port} in ${config.env} mode`);
            logger.info(`API Docs: http://localhost:${config.port}/api-docs`);
            logger.info(`Client URL: ${config.clientUrl}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
};

startServer();

export { app, io };
