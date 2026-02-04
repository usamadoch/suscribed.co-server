import express from 'express';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';
import {
    getDashboardStats,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getCreators,
    updateCreatorPage,
    getPosts,
    deletePost,
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get('/stats', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Creator Management
router.get('/creators', getCreators);
router.patch('/creators/:id', updateCreatorPage);

// Content Moderation
router.get('/posts', getPosts);
router.delete('/posts/:id', deletePost);

export default router;
