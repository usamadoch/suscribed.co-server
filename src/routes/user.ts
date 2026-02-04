import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateUserSchema } from '../utils/validators.js';
import User from '../models/User.js';
import CreatorPage from '../models/CreatorPage.js';

const router = Router();

// Get user profile by ID
router.get('/id/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('-passwordHash -notificationPreferences');

        if (!user) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
            return;
        }

        // If creator, include page info
        let page = null;
        if (user.role === 'creator') {
            page = await CreatorPage.findOne({ userId: user._id });
        }

        res.json({
            success: true,
            data: { user, page },
        });
    } catch (error) {
        next(error);
    }
});

// Get user profile by username
router.get('/:username', async (req, res, next) => {
    try {
        const { username } = req.params;

        const user = await User.findOne({ username: username.toLowerCase() })
            .select('-passwordHash -notificationPreferences');

        if (!user) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
            return;
        }

        // If creator, include page info
        let page = null;
        if (user.role === 'creator') {
            page = await CreatorPage.findOne({ userId: user._id });
        }

        res.json({
            success: true,
            data: { user, page },
        });
    } catch (error) {
        next(error);
    }
});

// Update current user profile
router.put(
    '/me',
    protect,
    validate(updateUserSchema),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?._id;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: req.body },
                { new: true, runValidators: true }
            ).select('-passwordHash');

            res.json({
                success: true,
                data: { user: updatedUser },
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
