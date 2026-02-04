# Server

Patreon-inspired MVP backend server built with Express, TypeScript, MongoDB, and Socket.io.

## Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Upstash Redis account (for caching, rate limiting, and background jobs)

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your:
   # - MongoDB Atlas connection string
   # - Upstash Redis credentials
   # - JWT secrets
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm start
   ```

## API Documentation

Swagger UI is available at: `http://localhost:5000/api-docs`

## Features

### Security
- JWT authentication with httpOnly cookies
- Redis-backed rate limiting
- Audit logging for user actions
- Refresh token rotation

### Performance
- Redis caching for pages and feeds
- BullMQ background jobs for notifications
- Cursor-based pagination
- MongoDB indexes for common queries

### Observability
- Winston structured logging
- Request correlation IDs
- Health and readiness endpoints
- Graceful shutdown

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:username` - Get user profile
- `PUT /api/users/me` - Update profile

### Pages (Creators)
- `GET /api/pages/:slug` - Get creator page
- `GET /api/pages/my/page` - Get own page
- `PUT /api/pages/my/page` - Update page

### Posts
- `GET /api/posts` - List posts (supports cursor pagination)
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike
- `GET /api/posts/:id/comments` - Get comments
- `POST /api/posts/:id/comments` - Add comment

### Memberships
- `GET /api/memberships` - Get memberships
- `POST /api/memberships` - Join creator
- `DELETE /api/memberships/:id` - Leave creator
- `GET /api/memberships/my-members` - Get my members (creator)

### Conversations
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Start conversation
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/:id/messages` - Send message

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all read
- `DELETE /api/notifications/:id` - Delete

### Analytics (Creator)
- `GET /api/analytics/overview` - Dashboard overview
- `GET /api/analytics/members` - Member analytics
- `GET /api/analytics/posts` - Post analytics
- `GET /api/analytics/engagement` - Engagement breakdown

### Upload
- `POST /api/upload/image` - Upload image
- `POST /api/upload/images` - Upload multiple images
- `POST /api/upload/video` - Upload video
- `POST /api/upload/audio` - Upload audio
- `POST /api/upload/file` - Upload file

### System
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check (DB + Redis)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No (default: 5000) |
| `CLIENT_URL` | Frontend URL for CORS | Yes |
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash REST API URL | Optional |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST API token | Optional |
| `UPSTASH_REDIS_URL` | Upstash Redis URL for BullMQ | Optional |
| `FEATURE_REDIS_CACHE` | Enable Redis caching | No |
| `FEATURE_BACKGROUND_JOBS` | Enable BullMQ jobs | No |
| `FEATURE_AUDIT_LOGS` | Enable audit logging | No (default: true) |

## Feature Flags

Features can be enabled/disabled via environment variables:

- `FEATURE_REDIS_CACHE=true` - Enable Redis caching
- `FEATURE_BACKGROUND_JOBS=true` - Enable BullMQ background jobs
- `FEATURE_AUDIT_LOGS=true` - Enable audit logging (default: true)


