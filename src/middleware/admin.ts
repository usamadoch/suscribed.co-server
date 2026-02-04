import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

/**
 * Middleware to ensure user is an admin
 * Must be used after the protect middleware
 */
export const adminOnly = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            },
        });
        return;
    }

    if (req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Admin access required',
            },
        });
        return;
    }

    next();
};

/**
 * Middleware to ensure user is admin OR the resource owner
 * Useful for routes where admin can access any resource
 */
export const adminOrOwner = (ownerIdExtractor: (req: AuthenticatedRequest) => string) => {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }

        const ownerId = ownerIdExtractor(req);
        const isOwner = req.user._id.toString() === ownerId;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied',
                },
            });
            return;
        }

        next();
    };
};
