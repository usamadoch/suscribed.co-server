import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import User from '../models/User.js';
import CreatorPage from '../models/CreatorPage.js';
import Post from '../models/Post.js';
import Membership from '../models/Membership.js';
import Comment from '../models/Comment.js';

// ============================================
// DASHBOARD STATS
// ============================================

export const getDashboardStats = async (
    _req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get counts
        const [
            totalUsers,
            totalCreators,
            totalMembers,
            totalPosts,
            totalMemberships,
            totalComments,
            newUsersThisMonth,
            newUsersThisWeek,
            newPostsThisMonth,
            newPostsThisWeek,
            activeMemberships,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'creator' }),
            User.countDocuments({ role: 'member' }),
            Post.countDocuments(),
            Membership.countDocuments(),
            Comment.countDocuments(),
            User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
            User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            Post.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
            Post.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            Membership.countDocuments({ status: 'active' }),
        ]);

        // Get recent users
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('displayName email role createdAt profileImage');

        // Get recent posts
        const recentPosts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title creatorId status visibility createdAt')
            .populate('creatorId', 'displayName');

        // Get top creators by member count
        const topCreators = await CreatorPage.find()
            .sort({ 'stats.memberCount': -1 })
            .limit(5)
            .populate('userId', 'displayName email profileImage');

        // Daily user signups for chart (last 30 days)
        const userGrowth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalCreators,
                    totalMembers,
                    totalPosts,
                    totalMemberships,
                    activeMemberships,
                    totalComments,
                },
                growth: {
                    newUsersThisMonth,
                    newUsersThisWeek,
                    newPostsThisMonth,
                    newPostsThisWeek,
                },
                recentActivity: {
                    users: recentUsers,
                    posts: recentPosts,
                },
                topCreators,
                charts: {
                    userGrowth,
                },
            },
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get dashboard stats',
            },
        });
    }
};

// ============================================
// USER MANAGEMENT
// ============================================

export const getUsers = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const role = req.query.role as string;
        const status = req.query.status as string;
        const search = req.query.search as string;
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build query
        const query: Record<string, unknown> = {};

        if (role && ['creator', 'member', 'admin'].includes(role)) {
            query.role = role;
        }

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        if (search) {
            query.$or = [
                { displayName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
            ];
        }

        const [users, totalItems] = await Promise.all([
            User.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limit)
                .select('-passwordHash'),
            User.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            success: true,
            data: users,
            meta: {
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get users',
            },
        });
    }
};

export const getUserById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select('-passwordHash');

        if (!user) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'User not found',
                },
            });
            return;
        }

        // Get additional data
        const [creatorPage, memberships, postsCount] = await Promise.all([
            user.role === 'creator' ? CreatorPage.findOne({ userId: id }) : null,
            Membership.find({ memberId: id }).populate('creatorId', 'displayName'),
            user.role === 'creator' ? Post.countDocuments({ creatorId: id }) : 0,
        ]);

        res.json({
            success: true,
            data: {
                user,
                creatorPage,
                memberships,
                postsCount,
            },
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get user',
            },
        });
    }
};

export const updateUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { role, isActive, displayName, email } = req.body;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'User not found',
                },
            });
            return;
        }

        // Prevent modifying super admin or self
        if (user.email === 'admin@test.com' && req.user?._id.toString() !== id) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot modify super admin',
                },
            });
            return;
        }

        // Update fields
        if (role && ['creator', 'member', 'admin'].includes(role)) {
            user.role = role;
        }

        if (typeof isActive === 'boolean') {
            user.isActive = isActive;
        }

        if (displayName) {
            user.displayName = displayName;
        }

        if (email) {
            user.email = email;
        }

        await user.save();

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update user',
            },
        });
    }
};

export const deleteUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'User not found',
                },
            });
            return;
        }

        // Prevent deleting super admin
        if (user.email === 'admin@test.com') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot delete super admin',
                },
            });
            return;
        }

        // Prevent self-deletion
        if (req.user?._id.toString() === id) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Cannot delete your own account',
                },
            });
            return;
        }

        // Delete related data
        await Promise.all([
            CreatorPage.deleteOne({ userId: id }),
            Post.deleteMany({ creatorId: id }),
            Membership.deleteMany({ $or: [{ memberId: id }, { creatorId: id }] }),
            Comment.deleteMany({ authorId: id }),
        ]);

        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            data: { message: 'User deleted successfully' },
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete user',
            },
        });
    }
};

// ============================================
// CREATOR MANAGEMENT
// ============================================

export const getCreators = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search as string;
        const sortBy = (req.query.sortBy as string) || 'stats.memberCount';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build query
        const query: Record<string, unknown> = {};

        if (search) {
            query.$or = [
                { displayName: { $regex: search, $options: 'i' } },
                { pageSlug: { $regex: search, $options: 'i' } },
            ];
        }

        const [creators, totalItems] = await Promise.all([
            CreatorPage.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'displayName email profileImage isActive'),
            CreatorPage.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            success: true,
            data: creators,
            meta: {
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error) {
        console.error('Error getting creators:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get creators',
            },
        });
    }
};

export const updateCreatorPage = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { isPublic } = req.body;
        // Note: isFeatured and isVerified can be added to CreatorPage model later

        const creatorPage = await CreatorPage.findById(id);

        if (!creatorPage) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Creator page not found',
                },
            });
            return;
        }

        if (typeof isPublic === 'boolean') {
            creatorPage.isPublic = isPublic;
        }

        // Note: Add isFeatured and isVerified fields to CreatorPage model if needed
        // For now, we'll store in a metadata field or handle separately

        await creatorPage.save();

        res.json({
            success: true,
            data: creatorPage,
        });
    } catch (error) {
        console.error('Error updating creator page:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update creator page',
            },
        });
    }
};

// ============================================
// CONTENT MODERATION
// ============================================

export const getPosts = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status as string;
        const search = req.query.search as string;
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build query
        const query: Record<string, unknown> = {};

        if (status && ['draft', 'published', 'scheduled'].includes(status)) {
            query.status = status;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const [posts, totalItems] = await Promise.all([
            Post.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limit)
                .populate('creatorId', 'displayName email profileImage'),
            Post.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            success: true,
            data: posts,
            meta: {
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get posts',
            },
        });
    }
};

export const deletePost = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const post = await Post.findById(id);

        if (!post) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Post not found',
                },
            });
            return;
        }

        // Delete comments
        await Comment.deleteMany({ postId: id });

        // Delete post
        await Post.findByIdAndDelete(id);

        // Update creator page stats
        await CreatorPage.findOneAndUpdate(
            { userId: post.creatorId },
            { $inc: { 'stats.postCount': -1 } }
        );

        res.json({
            success: true,
            data: { message: 'Post deleted successfully' },
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete post',
            },
        });
    }
};
