# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Excel Forum — a full-stack forum application with a Spring Boot 3.2 backend and Vue 3 frontend. Features include posts, replies, likes, favorites, follows, private messages, notifications (SSE + WebSocket via STOMP), points/levels, admin management, file upload, and reporting.

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

### Frontend (excel-forum-frontend/)
```bash
# Install dependencies
cd excel-forum-frontend && npm install

# Dev server (port 5173, proxies /api and /ws to backend:8080)
npm run dev

# Production build
npm run build
```

## Architecture

### Backend — Spring Boot + MyBatis-Plus + Redis
Standard layered architecture under `com.excel/forum`:
- **controller/** — REST API controllers (Auth, Post, Reply, User, Category, Admin, etc.)
- **service/** + **service/impl/** — business logic layer
- **mapper/** — MyBatis-Plus mapper interfaces
- **entity/** — JPA/MyBatis-Plus entities + **entity/dto/** for request/response DTOs
- **config/** — SecurityConfig (Spring Security + JWT filter), WebSocketConfig (STOMP), MyBatisPlusConfig, FileStorageConfig, ScheduledTasks
- **security/** — JwtAuthenticationFilter
- **util/** — utility classes

Key infrastructure:
- **Auth**: JWT-based, token in `Authorization: Bearer` header. JwtAuthenticationFilter validates on every request.
- **WebSocket**: STOMP over SockJS at `/ws`. Public channel `/topic/forum`, per-user channel `/topic/notifications/user/{userId}`.
- **File storage**: Local filesystem or MinIO, configured via `file.storage.type` in application.yml.
- **Points system**: Configurable rules in application.yml (`points.*`, `level.*`).

### Frontend — Vue 3 + Vite + Element Plus + Pinia
- **router/index.js** — Vue Router with auth guards (`requiresAuth`, `requiresAdmin`, `guest` meta). Admin pages nested under `/admin` with `AdminLayout.vue`.
- **stores/user.js** — Pinia store for auth state, token/user persisted in localStorage.
- **api/index.js** — Axios instance with JWT interceptor and 401 auto-redirect to login.
- **composables/useForumEvents.js** — STOMP WebSocket client for real-time events and notifications.
- **composables/useTheme.js** — Theme switching.
- **views/** — Page components. Admin pages in `views/admin/`.
- **components/** — Reusable components (Layout, PostList, TiptapEditor, NotificationList, etc.).
- **styles/admin-table.css** — Shared styles for admin management tables.

Rich text editor: TipTap with code highlighting (lowlight), image, link, table, and underline extensions.

## API Convention

All API endpoints are prefixed with `/api`. Frontend proxy forwards `/api/*` to `http://localhost:8080`. Response format: axios interceptor unwraps `response.data`, so API calls return the payload directly.

## Language

All UI text and code comments are in Chinese.
