import request from 'supertest';
import { createTestApp } from './testApp.js';
import { createTestMember, createTestCreator } from './helpers.js';
import Membership from '../models/Membership.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const app = createTestApp();

describe('Messaging API', () => {
    describe('GET /api/conversations', () => {
        it('should return empty array when no conversations', async () => {
            const { accessToken } = await createTestMember();

            const response = await request(app)
                .get('/api/conversations')
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.conversations).toEqual([]);
        });

        it('should return user\'s conversations', async () => {
            const { user: creator } = await createTestCreator();
            const { user: member, accessToken } = await createTestMember();

            // Create conversation directly
            await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
            });

            const response = await request(app)
                .get('/api/conversations')
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.conversations).toHaveLength(1);
        });

        it('should require authentication', async () => {
            const response = await request(app).get('/api/conversations');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/conversations', () => {
        it('should create conversation when membership exists', async () => {
            const { user: creator, page } = await createTestCreator();
            const { user: member, accessToken } = await createTestMember();

            // Create membership
            await Membership.create({
                memberId: member._id,
                creatorId: creator._id,
                pageId: page!._id,
                status: 'active',
            });

            const response = await request(app)
                .post('/api/conversations')
                .set('Cookie', `accessToken=${accessToken}`)
                .send({ recipientId: creator._id });

            expect(response.status).toBe(201);
            expect(response.body.data.conversation).toBeDefined();
            expect(response.body.data.isNew).toBe(true);
        });

        it('should return existing conversation', async () => {
            const { user: creator, page } = await createTestCreator();
            const { user: member, accessToken } = await createTestMember();

            // Create membership
            await Membership.create({
                memberId: member._id,
                creatorId: creator._id,
                pageId: page!._id,
                status: 'active',
            });

            // Create conversation
            await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
            });

            const response = await request(app)
                .post('/api/conversations')
                .set('Cookie', `accessToken=${accessToken}`)
                .send({ recipientId: creator._id });

            expect(response.status).toBe(200);
            expect(response.body.data.isNew).toBe(false);
        });

        it('should reject conversation without membership', async () => {
            const { user: creator } = await createTestCreator();
            const { accessToken } = await createTestMember();

            const response = await request(app)
                .post('/api/conversations')
                .set('Cookie', `accessToken=${accessToken}`)
                .send({ recipientId: creator._id });

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });
    });

    describe('GET /api/conversations/:id/messages', () => {
        it('should return messages for participant', async () => {
            const { user: creator } = await createTestCreator();
            const { user: member, accessToken } = await createTestMember();

            const conversation = await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
            });

            await Message.create({
                conversationId: conversation._id,
                senderId: creator._id,
                content: 'Hello!',
            });

            const response = await request(app)
                .get(`/api/conversations/${conversation._id}/messages`)
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.messages).toHaveLength(1);
            expect(response.body.data.messages[0].content).toBe('Hello!');
        });

        it('should reject non-participant', async () => {
            const { user: creator } = await createTestCreator();
            const { user: member } = await createTestMember();
            const { accessToken: outsiderToken } = await createTestMember({ email: 'outsider@example.com' });

            const conversation = await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
            });

            const response = await request(app)
                .get(`/api/conversations/${conversation._id}/messages`)
                .set('Cookie', `accessToken=${outsiderToken}`);

            expect(response.status).toBe(404); // Returns 404 to not leak existence
        });
    });

    describe('POST /api/conversations/:id/messages', () => {
        it('should send message as participant', async () => {
            const { user: creator } = await createTestCreator();
            const { user: member, accessToken } = await createTestMember();

            const conversation = await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
                unreadCounts: {},
            });

            const response = await request(app)
                .post(`/api/conversations/${conversation._id}/messages`)
                .set('Cookie', `accessToken=${accessToken}`)
                .send({ content: 'Hello creator!' });

            expect(response.status).toBe(201);
            expect(response.body.data.message.content).toBe('Hello creator!');
        });

        it('should reject message from non-participant', async () => {
            const { user: creator } = await createTestCreator();
            const { user: member } = await createTestMember();
            const { accessToken: outsiderToken } = await createTestMember({ email: 'msgoutsider@example.com' });

            const conversation = await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
            });

            const response = await request(app)
                .post(`/api/conversations/${conversation._id}/messages`)
                .set('Cookie', `accessToken=${outsiderToken}`)
                .send({ content: 'Intruder message!' });

            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/conversations/:conversationId/messages/:messageId/read', () => {
        it('should mark message as read for participant', async () => {
            const { user: creator } = await createTestCreator();
            const { user: member, accessToken } = await createTestMember();

            const conversation = await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
            });

            const message = await Message.create({
                conversationId: conversation._id,
                senderId: creator._id,
                content: 'Read me!',
                status: 'sent',
            });

            const response = await request(app)
                .put(`/api/conversations/${conversation._id}/messages/${message._id}/read`)
                .set('Cookie', `accessToken=${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.message.status).toBe('read');
        });

        it('should reject non-participant from marking message read', async () => {
            const { user: creator } = await createTestCreator();
            const { user: member } = await createTestMember();
            const { accessToken: outsiderToken } = await createTestMember({ email: 'readoutsider@example.com' });

            const conversation = await Conversation.create({
                participants: [creator._id, member._id],
                creatorId: creator._id,
                memberId: member._id,
                isActive: true,
            });

            const message = await Message.create({
                conversationId: conversation._id,
                senderId: creator._id,
                content: 'Secret message',
                status: 'sent',
            });

            const response = await request(app)
                .put(`/api/conversations/${conversation._id}/messages/${message._id}/read`)
                .set('Cookie', `accessToken=${outsiderToken}`);

            expect(response.status).toBe(404);
        });
    });
});
