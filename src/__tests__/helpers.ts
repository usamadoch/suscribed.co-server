import jwt from 'jsonwebtoken';
import { Types, HydratedDocument } from 'mongoose';
import User, { IUserDocument } from '../models/User.js';
import CreatorPage, { ICreatorPageDocument } from '../models/CreatorPage.js';
import config from '../config/index.js';

interface TestUserData {
    email: string;
    password: string;
    displayName: string;
    username: string;
    role: 'member' | 'creator';
}

interface TestUser {
    user: HydratedDocument<IUserDocument>;
    accessToken: string;
    page?: HydratedDocument<ICreatorPageDocument>;
}

/**
 * Create a test user and generate access token
 */
export const createTestUser = async (data: Partial<TestUserData> = {}): Promise<TestUser> => {
    const uniqueId = Math.random().toString(36).slice(2, 8);
    const defaultData: TestUserData = {
        email: `test-${uniqueId}@example.com`,
        password: 'TestPassword123!',
        displayName: 'Test User',
        username: `user${uniqueId}`,  // Keep under 30 chars
        role: 'member',
        ...data,
    };

    const user = new User({
        email: defaultData.email,
        passwordHash: defaultData.password, // Will be hashed by pre-save hook
        displayName: defaultData.displayName,
        username: defaultData.username,
        role: defaultData.role,
        isEmailVerified: true,
    });
    await user.save();

    // Generate access token
    const accessToken = jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        },
        config.jwt.accessSecret,
        { expiresIn: '1h' } as jwt.SignOptions
    );

    let page: HydratedDocument<ICreatorPageDocument> | undefined;
    if (defaultData.role === 'creator') {
        const creatorPage = new CreatorPage({
            userId: user._id,
            pageSlug: defaultData.username,
            displayName: defaultData.displayName,
        });
        await creatorPage.save();
        page = creatorPage;
    }

    return { user, accessToken, page };
};

/**
 * Create test member
 */
export const createTestMember = async (overrides: Partial<TestUserData> = {}): Promise<TestUser> => {
    return createTestUser({ role: 'member', ...overrides });
};

/**
 * Create test creator with page
 */
export const createTestCreator = async (overrides: Partial<TestUserData> = {}): Promise<TestUser> => {
    return createTestUser({ role: 'creator', ...overrides });
};

/**
 * Generate a valid MongoDB ObjectId
 */
export const generateObjectId = (): string => {
    return new Types.ObjectId().toString();
};

/**
 * Generate auth header for requests
 */
export const authHeader = (token: string): { Cookie: string } => {
    return { Cookie: `accessToken=${token}` };
};

/**
 * Wait for a specified time (useful for timing tests)
 */
export const wait = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
