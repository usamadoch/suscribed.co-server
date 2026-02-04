# Authorization & Ownership Audit Report

## Summary

This document audits all API endpoints for proper authorization and ownership checks.

| Symbol | Meaning |
|--------|---------|
| ✅ | Properly authorized |
| ⚠️ | Needs review |
| ❌ | Issue found |

---

## Authentication Routes (`/api/auth`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `POST /signup` | No | N/A | N/A | ✅ |
| `POST /login` | No | N/A | N/A | ✅ |
| `POST /refresh` | No (cookie) | N/A | N/A | ✅ |
| `POST /logout` | Yes | N/A | User's own session | ✅ |
| `GET /me` | Yes | N/A | N/A | ✅ |

---

## User Routes (`/api/users`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `GET /:username` | No | N/A | N/A (public) | ✅ |
| `PUT /me` | Yes | N/A | Implicit (own profile) | ✅ |

---

## Page Routes (`/api/pages`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `GET /:slug` | Optional | N/A | N/A (public view) | ✅ |
| `GET /my/page` | Yes | N/A | Implicit (own page) | ✅ |
| `PUT /my/page` | Yes | N/A | Implicit (own page) | ✅ |

---

## Post Routes (`/api/posts`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `GET /` | Optional | N/A | N/A | ✅ |
| `GET /:id` | Optional | N/A | Members-only check | ✅ |
| `POST /` | Yes | `requireCreator` | N/A | ✅ |
| `PUT /:id` | Yes | `requireCreator` | ✅ `creatorId` match | ✅ |
| `DELETE /:id` | Yes | `requireCreator` | ✅ `creatorId` match | ✅ |
| `POST /:id/like` | Yes | N/A | N/A | ✅ |
| `GET /:id/comments` | No | N/A | N/A (public) | ✅ |
| `POST /:id/comments` | Yes | N/A | N/A | ✅ |

---

## Membership Routes (`/api/memberships`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `GET /` | Yes | N/A | ✅ `memberId` filter | ✅ |
| `GET /my-members` | Yes | N/A | ✅ `creatorId` filter | ✅ |
| `POST /` | Yes | N/A | N/A | ✅ |
| `DELETE /:id` | Yes | N/A | ✅ `memberId` match | ✅ |

---

## Conversation Routes (`/api/conversations`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `GET /` | Yes | N/A | ✅ `participants` filter | ✅ |
| `POST /` | Yes | N/A | Membership check | ✅ |
| `GET /:id/messages` | Yes | N/A | ✅ Participant check | ✅ |
| `POST /:id/messages` | Yes | N/A | ✅ Participant check | ✅ |
| `PUT /:cid/messages/:mid/read` | Yes | N/A | ⚠️ No participant check | **FIX NEEDED** |

### Issue: Mark Message Read

The `PUT /:conversationId/messages/:messageId/read` endpoint doesn't verify the user is a participant in the conversation before marking the message as read.

**Fix:** Add participant verification.

---

## Notification Routes (`/api/notifications`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `GET /` | Yes | N/A | ✅ `recipientId` filter | ✅ |
| `GET /unread-count` | Yes | N/A | ✅ `recipientId` filter | ✅ |
| `PUT /:id/read` | Yes | N/A | ✅ `recipientId` match | ✅ |
| `PUT /read-all` | Yes | N/A | ✅ `recipientId` filter | ✅ |
| `DELETE /:id` | Yes | N/A | ✅ `recipientId` match | ✅ |

---

## Upload Routes (`/api/upload`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `POST /image` | Yes | N/A | N/A | ✅ |
| `POST /images` | Yes | N/A | N/A | ✅ |
| `POST /video` | Yes | N/A | N/A | ✅ |
| `POST /audio` | Yes | N/A | N/A | ✅ |
| `POST /file` | Yes | N/A | N/A | ✅ |
| `DELETE /:type/:filename` | Yes | N/A | ⚠️ No owner check | **FIX NEEDED** |

### Issue: Delete File

The `DELETE /:type/:filename` endpoint allows any authenticated user to delete any uploaded file. Should verify the file was uploaded by the requesting user.

**Note:** This is complex to fix without a file metadata database. For MVP, consider:
- Option A: Disable file deletion endpoint
- Option B: Add file metadata tracking
- Option C: Accept risk for MVP (files are random-named, low exploitation risk)

---

## Analytics Routes (`/api/analytics`)

| Endpoint | Auth Required | Role Check | Ownership Check | Status |
|----------|--------------|------------|-----------------|--------|
| `GET /overview` | Yes | `requireCreator` | Implicit (own analytics) | ✅ |
| `GET /members` | Yes | `requireCreator` | Implicit (own analytics) | ✅ |
| `GET /posts` | Yes | `requireCreator` | Implicit (own analytics) | ✅ |
| `GET /engagement` | Yes | `requireCreator` | Implicit (own analytics) | ✅ |

---

## Issues Found

### 1. Conversation: Mark Message Read (Medium Priority)

**File:** `src/routes/conversation.ts` line 256
**Issue:** No participant verification before marking message as read

### 2. Upload: Delete File (Low Priority for MVP)

**File:** `src/routes/upload.ts` line 214
**Issue:** No ownership verification for file deletion

---

## Recommendations

1. **Fix conversation message read endpoint** - Add participant check
2. **For upload deletion** - Accept for MVP, add TODO for file metadata tracking
3. **Consider adding rate limiters** to all mutation endpoints (already done for auth)
