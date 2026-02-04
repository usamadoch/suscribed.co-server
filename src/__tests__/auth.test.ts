import request from 'supertest';
import { createTestApp } from './testApp.js';
import { createTestMember } from './helpers.js';

const app = createTestApp();

describe('Auth API', () => {
    describe('POST /api/auth/signup', () => {
        it('should register a new member successfully', async () => {
            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'newuser@example.com',
                    password: 'Password123!',
                    displayName: 'New User',
                    username: 'newuser',
                    role: 'member',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBe('newuser@example.com');
            expect(response.body.data.user.passwordHash).toBeUndefined(); // Should not expose password
        });

        it('should register a new creator with page', async () => {
            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'creator@example.com',
                    password: 'Password123!',
                    displayName: 'New Creator',
                    username: 'newcreator',
                    role: 'creator',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.role).toBe('creator');
        });

        it('should reject duplicate email', async () => {
            await createTestMember({ email: 'duplicate@example.com' });

            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'duplicate@example.com',
                    password: 'Password123!',
                    displayName: 'Duplicate',
                    username: 'duplicate',
                    role: 'member',
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
        });

        it('should reject duplicate username', async () => {
            await createTestMember({ username: 'takenname' });

            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'unique@example.com',
                    password: 'Password123!',
                    displayName: 'Unique User',
                    username: 'takenname',
                    role: 'member',
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should reject weak password', async () => {
            const response = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'test@example.com',
                    password: '123', // Too weak
                    displayName: 'Test',
                    username: 'weakpass',
                    role: 'member',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            // Create user first
            await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'logintest@example.com',
                    password: 'Password123!',
                    displayName: 'Login Test',
                    username: 'logintest',
                    role: 'member',
                });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'logintest@example.com',
                    password: 'Password123!',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            // Check cookies are set
            expect(response.headers['set-cookie']).toBeDefined();
        });

        it('should reject invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should reject invalid password', async () => {
            await createTestMember({ email: 'badpass@example.com', password: 'CorrectPassword123!' });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'badpass@example.com',
                    password: 'WrongPassword123!',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user when authenticated', async () => {
            const { accessToken } = await createTestMember({ email: 'metest@example.com' });

            const response = await request(app)
                .get('/api/auth/me')
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('metest@example.com');
        });

        it('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .get('/api/auth/me');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Cookie', 'accessToken=invalidtoken');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            const { accessToken } = await createTestMember();

            const response = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .post('/api/auth/logout');

            expect(response.status).toBe(401);
        });
    });
});
