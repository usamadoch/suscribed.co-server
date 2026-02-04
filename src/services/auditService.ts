import { Request } from 'express';
import { Types } from 'mongoose';
import AuditLog, { AuditAction } from '../models/AuditLog.js';
import config from '../config/index.js';
import { logger } from '../config/logger.js';

interface AuditLogInput {
    userId: Types.ObjectId | string;
    action: AuditAction;
    resourceType?: string;
    resourceId?: Types.ObjectId | string;
    metadata?: Record<string, unknown>;
    req?: Request;
}

/**
 * Log an audit event
 */
export const logAudit = async (input: AuditLogInput): Promise<void> => {
    // Skip if audit logs are disabled
    if (!config.features.enableAuditLogs) {
        return;
    }

    try {
        const { userId, action, resourceType, resourceId, metadata, req } = input;

        await AuditLog.create({
            userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
            action,
            resourceType,
            resourceId: resourceId
                ? (typeof resourceId === 'string' ? new Types.ObjectId(resourceId) : resourceId)
                : undefined,
            metadata,
            ipAddress: req?.ip,
            userAgent: req?.headers['user-agent'],
            correlationId: req?.correlationId,
        });

        logger.debug('Audit log created', { action, resourceType, resourceId });
    } catch (error) {
        // Don't throw - audit logging should not break the main flow
        logger.error('Failed to create audit log', { error, input });
    }
};

/**
 * Convenience methods for common audit actions
 */
export const audit = {
    login: (userId: string | Types.ObjectId, req?: Request) =>
        logAudit({ userId, action: 'login', req }),

    logout: (userId: string | Types.ObjectId, req?: Request) =>
        logAudit({ userId, action: 'logout', req }),

    signup: (userId: string | Types.ObjectId, req?: Request, metadata?: Record<string, unknown>) =>
        logAudit({ userId, action: 'signup', req, metadata }),

    membershipJoin: (
        userId: string | Types.ObjectId,
        membershipId: string | Types.ObjectId,
        req?: Request,
        metadata?: Record<string, unknown>
    ) =>
        logAudit({
            userId,
            action: 'membership_join',
            resourceType: 'Membership',
            resourceId: membershipId,
            req,
            metadata,
        }),

    membershipLeave: (
        userId: string | Types.ObjectId,
        membershipId: string | Types.ObjectId,
        req?: Request,
        metadata?: Record<string, unknown>
    ) =>
        logAudit({
            userId,
            action: 'membership_leave',
            resourceType: 'Membership',
            resourceId: membershipId,
            req,
            metadata,
        }),

    postCreate: (
        userId: string | Types.ObjectId,
        postId: string | Types.ObjectId,
        req?: Request,
        metadata?: Record<string, unknown>
    ) =>
        logAudit({
            userId,
            action: 'post_create',
            resourceType: 'Post',
            resourceId: postId,
            req,
            metadata,
        }),

    postUpdate: (
        userId: string | Types.ObjectId,
        postId: string | Types.ObjectId,
        req?: Request,
        metadata?: Record<string, unknown>
    ) =>
        logAudit({
            userId,
            action: 'post_update',
            resourceType: 'Post',
            resourceId: postId,
            req,
            metadata,
        }),

    postDelete: (
        userId: string | Types.ObjectId,
        postId: string | Types.ObjectId,
        req?: Request,
        metadata?: Record<string, unknown>
    ) =>
        logAudit({
            userId,
            action: 'post_delete',
            resourceType: 'Post',
            resourceId: postId,
            req,
            metadata,
        }),

    pageUpdate: (
        userId: string | Types.ObjectId,
        pageId: string | Types.ObjectId,
        req?: Request,
        metadata?: Record<string, unknown>
    ) =>
        logAudit({
            userId,
            action: 'page_update',
            resourceType: 'CreatorPage',
            resourceId: pageId,
            req,
            metadata,
        }),
};

export default audit;
