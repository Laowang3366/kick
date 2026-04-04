# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Excel Forum — a full-stack forum application with a Spring Boot 3.2 backend and Vue 3 frontend. Features include posts, replies, likes, favorites, follows, private messages, notifications (WebSocket via STOMP), points/levels, admin management, file upload, and reporting.

## Build & Run Commands

### Backend (excel-forum-backend/)
```bash
# Build
cd excel-forum-backend && mvn clean package

# Run
java -jar target/forum-1.0.0.jar

# Run in dev mode
mvn spring-boot:run
```
- Requires: Java 17, MySQL 8.0+, Redis, Maven 3.6+
- Database: `excel_forum` (utf8mb4), schema defined in `src/main/resources/schema.sql`
- Starts on port 8080
- No test infrastructure exists — `src/test/` is empty

### Frontend (excel-forum-frontend/)
```bash
# Install dependencies
cd excel-forum-frontend && npm install

# Dev server (port 5173)
npm run dev

# Production build
npm run build
```

## Architecture

### Backend — Spring Boot + MyBatis-Plus + Redis
Standard layered architecture under `com.excel.forum`:
- **controller/** — 13 REST API controllers (Auth, Post, Reply, User, Category, Admin, Upload, Like, Favorite, Message, Notification, Report, ChatMessage)
- **service/** + **service/impl/** — 19 service interfaces with 18 implementations
- **mapper/** — 19 MyBatis-Plus mapper interfaces
- **entity/** — 20 entities + **entity/dto/** (AuthResponse, LoginRequest, RegisterRequest, PostDTO, ReplyDTO, CategoryWithPostCount)
- **config/** — SecurityConfig, WebSocketConfig, MyBatisPlusConfig, FileStorageConfig, WebMvcConfig (CORS), ScheduledTasks, DataInitializer, DatabaseInitializer
- **security/** — JwtAuthenticationFilter
- **util/** — JwtUtil

Key infrastructure:
- **Auth**: JWT (jjwt 0.12.5), token in `Authorization: Bearer` header. 24-hour expiration. Roles: user, moderator, admin.
- **Database auto-init**: `DatabaseInitializer` dynamically creates/updates tables on startup. `DataInitializer` seeds initial data (categories, admin user).
- **WebSocket**: STOMP over SockJS at `/ws`. Public channel `/topic/forum`, per-user channel `/topic/notifications/user/{userId}`.
- **File storage**: Local filesystem (`./uploads`) or MinIO, configured via `file.storage.type` in application.yml. 20MB limit.
- **Points system**: Configurable rules in application.yml (`points.*`, `level.*`). Levels: 新手(0), 入门(100), 熟练(500), 专家(1000), 大师(5000), 传说(10000).
- **Scheduled tasks**: `ScheduledTasks` handles background maintenance.

### Frontend — Vue 3 + Vite + Element Plus + Pinia
- **router/index.js** — Vue Router with `beforeEach` guard checking `requiresAuth`, `requiresAdmin`, `guest` route meta. Admin pages nested under `/admin` with `AdminLayout.vue`.
- **stores/user.js** — Pinia store for auth state (token/user persisted in localStorage), unread counts, profile updates.
- **api/index.js** — Axios instance (baseURL `/api`, 10s timeout) with JWT request interceptor and response interceptor (401→login redirect with anti-duplicate dialog).
- **composables/useForumEvents.js** — STOMP WebSocket client with auto-reconnect.
- **composables/useTheme.js** — Light/dark theme switching, persisted to localStorage.
- **styles/theme.css** — CSS variables for both themes (gradients, colors, shadows, border-radius).
- **styles/admin-table.css** — Shared styles for admin management tables (ellipsis, tooltips, resizable columns, no fixed columns).
- **views/** — Page components. Admin pages in `views/admin/` (Dashboard, UserManage, PostManage, ReplyManage, ReportManage, PostReview, ForumManage, PointsManage, QuestionManage, NotificationManage, TrashManage).

Vite proxy configuration (`vite.config.js`):
- `/api` → `http://localhost:8080`
- `/uploads` → `http://localhost:8080`
- `/ws` → `http://localhost:8080` (WebSocket proxy)

Rich text editor: TipTap with code highlighting (lowlight), image, link, table, and underline extensions.

## API Convention

All API endpoints are prefixed with `/api`. Frontend proxy forwards `/api/*`, `/uploads/*`, and `/ws` to `http://localhost:8080`. Axios response interceptor unwraps `response.data`, so API calls return the payload directly.

## Important Notes

- Initial admin account must be inserted manually in the database or is seeded by `DataInitializer`.
- All UI text and code comments are in Chinese.
- File encoding must be UTF-8 — avoid PowerShell's Get-Content/Set-Content which can break encoding.
- Admin table styling uses the shared `admin-table.css` pattern: wrap tables in `.admin-table`, use `show-overflow-tooltip`, `min-width` instead of fixed `width`, no `fixed="right"` on columns.
