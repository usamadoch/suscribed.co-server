import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { protect } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = Router();

// Get notifications
router.get('/', protect, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;
        const userId = req.user?._id;

        const query: Record<string, unknown> = { recipientId: userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

        res.json({
            success: true,
            data: { notifications, unreadCount },
            meta: {
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    totalItems: total,
                    totalPages: Math.ceil(total / Number(limit)),
                    hasNextPage: Number(page) * Number(limit) < total,
                    hasPrevPage: Number(page) > 1,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get unread count
router.get('/unread-count', protect, async (req: AuthenticatedRequest, res, next) => {
    try {
        const count = await Notification.countDocuments({
            recipientId: req.user?._id,
            isRead: false,
        });

        res.json({
            success: true,
            data: { count },
        });
    } catch (error) {
        next(error);
    }
});

// Mark as read
router.put('/:id/read', protect, async (req: AuthenticatedRequest, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipientId: req.user?._id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Notification not found' },
            });
            return;
        }

        res.json({
            success: true,
            data: { notification },
        });
    } catch (error) {
        next(error);
    }
});

// Mark all as read
router.put('/read-all', protect, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        await Notification.updateMany(
            { recipientId: req.user?._id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({
            success: true,
            data: { message: 'All notifications marked as read' },
        });
    } catch (error) {
        next(error);
    }
});

// Delete notification
router.delete('/:id', protect, async (req: AuthenticatedRequest, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipientId: req.user?._id,
        });

        if (!notification) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Notification not found' },
            });
            return;
        }

        res.json({
            success: true,
            data: { message: 'Notification deleted' },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
