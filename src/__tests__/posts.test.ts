import request from 'supertest';
import { createTestApp } from './testApp.js';
import { createTestMember, createTestCreator, generateObjectId } from './helpers.js';
import Post from '../models/Post.js';
import Membership from '../models/Membership.js';

const app = createTestApp();

describe('Posts API', () => {
    describe('GET /api/posts', () => {
        it('should return empty array when no posts', async () => {
            const response = await request(app).get('/api/posts');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.posts).toEqual([]);
        });

        it('should return published posts', async () => {
            const { user, page } = await createTestCreator();

            await Post.create({
                creatorId: user._id,
                pageId: page!._id,
                caption: 'Test Post',
                status: 'published',
                visibility: 'public',
                publishedAt: new Date(),
            });

            const response = await request(app).get('/api/posts');

            expect(response.status).toBe(200);
            expect(response.body.data.posts).toHaveLength(1);
            expect(response.body.data.posts[0].caption).toBe('Test Post');
        });

        it('should not return draft posts', async () => {
            const { user, page } = await createTestCreator();

            await Post.create({
                creatorId: user._id,
                pageId: page!._id,
                caption: 'Draft Post',
                status: 'draft',
                visibility: 'public',
            });

            const response = await request(app).get('/api/posts');

            expect(response.status).toBe(200);
            expect(response.body.data.posts).toHaveLength(0);
        });
    });

    describe('POST /api/posts', () => {
        it('should create post when creator is authenticated', async () => {
            const { accessToken } = await createTestCreator();

            const response = await request(app)
                .post('/api/posts')
                .set('Cookie', `accessToken=${accessToken}`)
                .send({
                    caption: 'New Post',
                    visibility: 'public',
                    status: 'published',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.caption).toBe('New Post');
        });

        it('should reject post creation from non-creator', async () => {
            const { accessToken } = await createTestMember();

            const response = await request(app)
                .post('/api/posts')
                .set('Cookie', `accessToken=${accessToken}`)
                .send({
                    caption: 'Attempted Post',
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should reject post creation without authentication', async () => {
            const response = await request(app)
                .post('/api/posts')
                .send({
                    caption: 'Unauthenticated Post',
                });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/posts/:id', () => {
        it('should return public post', async () => {
            const { user, page } = await createTestCreator();

            const post = await Post.create({
                creatorId: user._id,
                pageId: page!._id,
                caption: 'Public Post',
                status: 'published',
                visibility: 'public',
                publishedAt: new Date(),
            });

            const response = await request(app).get(`/api/posts/${post._id}`);

            expect(response.status).toBe(200);
            expect(response.body.data.post.caption).toBe('Public Post');
        });

        it('should return 404 for non-existent post', async () => {
            const response = await request(app).get(`/api/posts/${generateObjectId()}`);

            expect(response.status).toBe(404);
            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        it('should restrict members-only post to non-members', async () => {
            const { user: creator, page } = await createTestCreator();

            const post = await Post.create({
                creatorId: creator._id,
                pageId: page!._id,
                caption: 'Members Only Post',
                status: 'published',
                visibility: 'members',
                publishedAt: new Date(),
            });

            // Unauthenticated user
            const response = await request(app).get(`/api/posts/${post._id}`);

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        it('should allow creator to view their members-only post', async () => {
            const { user: creator, page, accessToken } = await createTestCreator();

            const post = await Post.create({
                creatorId: creator._id,
                pageId: page!._id,
                caption: 'My Members Only Post',
                status: 'published',
                visibility: 'members',
                publishedAt: new Date(),
            });

            const response = await request(app)
                .get(`/api/posts/${post._id}`)
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.post.caption).toBe('My Members Only Post');
        });

        it('should allow member to view members-only post', async () => {
            const { user: creator, page } = await createTestCreator();
            const { user: member, accessToken: memberToken } = await createTestMember();

            // Create membership
            await Membership.create({
                memberId: member._id,
                creatorId: creator._id,
                pageId: page!._id,
                status: 'active',
            });

            const post = await Post.create({
                creatorId: creator._id,
                pageId: page!._id,
                caption: 'Members Only Post',
                status: 'published',
                visibility: 'members',
                publishedAt: new Date(),
            });

            const response = await request(app)
                .get(`/api/posts/${post._id}`)
                .set('Cookie', `accessToken=${memberToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe('PUT /api/posts/:id', () => {
        it('should update own post', async () => {
            const { user, page, accessToken } = await createTestCreator();

            const post = await Post.create({
                creatorId: user._id,
                pageId: page!._id,
                caption: 'Original Caption',
                status: 'draft',
            });

            const response = await request(app)
                .put(`/api/posts/${post._id}`)
                .set('Cookie', `accessToken=${accessToken}`)
                .send({ caption: 'Updated Caption' });

            expect(response.status).toBe(200);
            expect(response.body.data.post.caption).toBe('Updated Caption');
        });

        it('should not allow updating another creator\'s post', async () => {
            const { user: creator1, page: page1 } = await createTestCreator();
            const { accessToken: token2 } = await createTestCreator({ username: 'creator2', email: 'c2@example.com' });

            const post = await Post.create({
                creatorId: creator1._id,
                pageId: page1!._id,
                caption: 'Creator 1 Post',
                status: 'draft',
            });

            const response = await request(app)
                .put(`/api/posts/${post._id}`)
                .set('Cookie', `accessToken=${token2}`)
                .send({ caption: 'Hijacked Caption' });

            expect(response.status).toBe(404); // Returns 404 because ownership filter
        });
    });

    describe('DELETE /api/posts/:id', () => {
        it('should delete own post', async () => {
            const { user, page, accessToken } = await createTestCreator();

            const post = await Post.create({
                creatorId: user._id,
                pageId: page!._id,
                caption: 'To Delete',
                status: 'draft',
            });

            const response = await request(app)
                .delete(`/api/posts/${post._id}`)
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);

            // Verify deleted
            const deleted = await Post.findById(post._id);
            expect(deleted).toBeNull();
        });

        it('should not allow deleting another creator\'s post', async () => {
            const { user: creator1, page: page1 } = await createTestCreator();
            const { accessToken: token2 } = await createTestCreator({ username: 'delcreator2', email: 'dc2@example.com' });

            const post = await Post.create({
                creatorId: creator1._id,
                pageId: page1!._id,
                caption: 'Cannot Delete',
            });

            const response = await request(app)
                .delete(`/api/posts/${post._id}`)
                .set('Cookie', `accessToken=${token2}`);

            expect(response.status).toBe(404);

            // Verify not deleted
            const stillExists = await Post.findById(post._id);
            expect(stillExists).not.toBeNull();
        });
    });
});
