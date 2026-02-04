/**
 * Cursor-based pagination utilities for MongoDB
 */

export interface CursorPaginationParams {
    cursor?: string;
    limit?: number;
}

export interface CursorPaginationResult<T> {
    data: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface PaginationMeta {
    cursor?: string;
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
}

/**
 * Encode a cursor from an ID and timestamp
 */
export const encodeCursor = (id: string, timestamp: Date | string): string => {
    const ts = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    return Buffer.from(`${id}:${ts}`).toString('base64url');
};

/**
 * Decode a cursor into an ID and timestamp
 */
export const decodeCursor = (cursor: string): { id: string; timestamp: Date } | null => {
    try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) return null;

        const id = decoded.substring(0, colonIndex);
        const timestamp = decoded.substring(colonIndex + 1);

        return { id, timestamp: new Date(timestamp) };
    } catch {
        return null;
    }
};

/**
 * Build MongoDB query conditions for cursor-based pagination
 * Uses (timestamp, _id) combination for stable ordering
 */
export const buildCursorQuery = (
    cursor: string | undefined,
    sortField: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
): Record<string, unknown> => {
    if (!cursor) return {};

    const decoded = decodeCursor(cursor);
    if (!decoded) return {};

    const { id, timestamp } = decoded;
    const operator = sortOrder === 'desc' ? '$lt' : '$gt';

    // For consistent pagination, use composite condition:
    // (timestamp < cursor_timestamp) OR (timestamp = cursor_timestamp AND _id < cursor_id)
    return {
        $or: [
            { [sortField]: { [operator]: timestamp } },
            {
                [sortField]: timestamp,
                _id: { [operator]: id },
            },
        ],
    };
};

/**
 * Process results and generate pagination metadata
 */
export const processPaginatedResults = <T extends { _id: { toString(): string };[key: string]: unknown }>(
    results: T[],
    limit: number,
    sortField: string = 'createdAt'
): CursorPaginationResult<T> => {
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        const timestamp = lastItem[sortField] as Date | string;
        nextCursor = encodeCursor(lastItem._id.toString(), timestamp);
    }

    return {
        data,
        nextCursor,
        hasMore,
    };
};

/**
 * Standard offset-based pagination (for backwards compatibility)
 */
export interface OffsetPaginationParams {
    page?: number;
    limit?: number;
}

export interface OffsetPaginationMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export const buildOffsetPaginationMeta = (
    page: number,
    limit: number,
    totalItems: number
): OffsetPaginationMeta => ({
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    hasNextPage: page * limit < totalItems,
    hasPrevPage: page > 1,
});
