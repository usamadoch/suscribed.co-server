import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { protect, requireCreator } from '../middleware/auth.js';
import Membership from '../models/Membership.js';
import Post from '../models/Post.js';
import PostView from '../models/PostView.js';
import CreatorPage from '../models/CreatorPage.js';

const router = Router();

// Get analytics overview (creator only)
router.get('/overview', protect, requireCreator, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        const previousStartDate = new Date();
        previousStartDate.setDate(previousStartDate.getDate() - Number(days) * 2);

        // Get page
        const page = await CreatorPage.findOne({ userId: creatorId });
        if (!page) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Page not found' },
            });
            return;
        }

        // Current period stats
        const [currentMembers, previousMembers] = await Promise.all([
            Membership.countDocuments({
                creatorId,
                joinedAt: { $gte: startDate },
                status: 'active',
            }),
            Membership.countDocuments({
                creatorId,
                joinedAt: { $gte: previousStartDate, $lt: startDate },
                status: 'active',
            }),
        ]);

        // Post views
        const postIds = await Post.find({ creatorId }).distinct('_id');

        const [currentViews, previousViews] = await Promise.all([
            PostView.countDocuments({
                postId: { $in: postIds },
                viewedAt: { $gte: startDate },
            }),
            PostView.countDocuments({
                postId: { $in: postIds },
                viewedAt: { $gte: previousStartDate, $lt: startDate },
            }),
        ]);

        // Engagement (likes + comments)
        const posts = await Post.find({ creatorId });
        const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
        const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);
        const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0);

        const engagementRate = totalViews > 0
            ? ((totalLikes + totalComments) / totalViews * 100).toFixed(1)
            : '0';

        // Calculate percentage changes
        const memberGrowth = previousMembers > 0
            ? (((currentMembers - previousMembers) / previousMembers) * 100).toFixed(1)
            : currentMembers > 0 ? '100' : '0';

        const viewGrowth = previousViews > 0
            ? (((currentViews - previousViews) / previousViews) * 100).toFixed(1)
            : currentViews > 0 ? '100' : '0';

        res.json({
            success: true,
            data: {
                totalMembers: page.memberCount,
                newMembers: currentMembers,
                memberGrowth: Number(memberGrowth),
                totalViews: currentViews,
                viewGrowth: Number(viewGrowth),
                totalPosts: page.postCount,
                totalLikes,
                totalComments,
                engagementRate: Number(engagementRate),
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get member analytics
router.get('/members', protect, requireCreator, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;
        const { days = 30 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        // Daily member growth
        const membersByDay = await Membership.aggregate([
            {
                $match: {
                    creatorId,
                    joinedAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$joinedAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Recent members
        const recentMembers = await Membership.find({
            creatorId,
            status: 'active',
        })
            .populate('memberId', 'displayName username avatarUrl')
            .sort({ joinedAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                dailyGrowth: membersByDay,
                recentMembers,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get post analytics
router.get('/posts', protect, requireCreator, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;

        // Top performing posts
        const topPosts = await Post.find({ creatorId, status: 'published' })
            .sort({ viewCount: -1 })
            .limit(10)
            .select('title viewCount likeCount commentCount publishedAt');

        // Recent posts performance
        const recentPosts = await Post.find({ creatorId, status: 'published' })
            .sort({ publishedAt: -1 })
            .limit(10)
            .select('title viewCount likeCount commentCount publishedAt');

        res.json({
            success: true,
            data: {
                topPosts,
                recentPosts,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get engagement breakdown
router.get('/engagement', protect, requireCreator, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const creatorId = req.user?._id;

        const posts = await Post.find({ creatorId, status: 'published' });

        const totalLikes = posts.reduce((sum, p) => sum + p.likeCount, 0);
        const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);
        const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0);

        res.json({
            success: true,
            data: {
                breakdown: {
                    likes: totalLikes,
                    comments: totalComments,
                    views: totalViews,
                },
                percentages: {
                    likes: totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : 0,
                    comments: totalViews > 0 ? ((totalComments / totalViews) * 100).toFixed(1) : 0,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
