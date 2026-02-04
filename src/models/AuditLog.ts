import mongoose, { Schema, Document, Types } from 'mongoose';

export type AuditAction =
    | 'login'
    | 'logout'
    | 'signup'
    | 'password_reset'
    | 'membership_join'
    | 'membership_leave'
    | 'post_create'
    | 'post_update'
    | 'post_delete'
    | 'comment_create'
    | 'comment_delete'
    | 'message_send'
    | 'page_update';

export interface IAuditLog {
    userId: Types.ObjectId;
    action: AuditAction;
    resourceType?: string;
    resourceId?: Types.ObjectId;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
    createdAt: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document { }

const auditLogSchema = new Schema<IAuditLogDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        action: {
            type: String,
            enum: [
                'login',
                'logout',
                'signup',
                'password_reset',
                'membership_join',
                'membership_leave',
                'post_create',
                'post_update',
                'post_delete',
                'comment_create',
                'comment_delete',
                'message_send',
                'page_update',
            ],
            required: true,
            index: true,
        },
        resourceType: {
            type: String,
            enum: ['Post', 'Membership', 'Comment', 'Message', 'CreatorPage', 'User'],
        },
        resourceId: {
            type: Schema.Types.ObjectId,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        correlationId: {
            type: String,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

// TTL index - auto delete logs after 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);

export default AuditLog;
