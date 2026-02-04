import express, { Application } from 'express';
import cookieParser from 'cookie-parser';

import { errorHandler } from '../middleware/errorHandler.js';
import authRoutes from '../routes/auth.js';
import userRoutes from '../routes/user.js';
import pageRoutes from '../routes/page.js';
import postRoutes from '../routes/post.js';
import membershipRoutes from '../routes/membership.js';
import conversationRoutes from '../routes/conversation.js';
import notificationRoutes from '../routes/notification.js';

/**
 * Create a test application instance
 */
export const createTestApp = (): Application => {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(cookieParser('test-secret'));

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/pages', pageRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api/memberships', membershipRoutes);
    app.use('/api/conversations', conversationRoutes);
    app.use('/api/notifications', notificationRoutes);

    // Error handler
    app.use(errorHandler);

    return app;
};

export default createTestApp;
