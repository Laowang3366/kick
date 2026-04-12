# Repository Guidelines

## Project Structure & Module Organization
This workspace contains two applications:

- `excel-forum-backend/`: Spring Boot 3.2 backend, with Java sources in `src/main/java/com/excel/forum`, config and Flyway migrations in `src/main/resources`, and tests in `src/test/java`.
- `reace_web/`: React 18 + Vite frontend, with app code under `src/app`, shared styles in `src/styles`, and static entry files such as `src/main.tsx` and `index.html`.

Treat `reace_web/dist/`, `reace_web/node_modules/`, `excel-forum-backend/target/`, `excel-forum-backend/uploads/`, and `*.log` as generated/runtime artifacts, not hand-edited source.

## Build, Test, and Development Commands
- `cd excel-forum-backend; mvn spring-boot:run`: run the backend locally on port `8080`.
- `cd excel-forum-backend; mvn clean package`: build the backend JAR into `target/`.
- `cd excel-forum-backend; mvn test`: run JUnit controller tests.
- `cd reace_web; npm run build`: create the production frontend bundle in `dist/`.
- `cd excel-forum-backend; java -jar target/forum-1.0.0.jar`: run the packaged backend.

The frontend currently has no dedicated `dev` or `test` script, so keep commands limited to the scripts already defined unless you are intentionally extending the toolchain.

## Coding Style & Naming Conventions
Frontend files use TypeScript/TSX with 2-space indentation and mostly double quotes. Use `PascalCase` for page and component files (`Home.tsx`), `camelCase` for functions and variables, and kebab-case for style or utility filenames where already established (`session-store.ts`).

Backend Java uses 4-space indentation, `PascalCase` classes, `camelCase` methods/fields, and package names under `com.excel.forum`. Prefer existing layers: `controller`, `service`, `mapper`, `entity`, `config`.

## Testing Guidelines
Backend tests are JUnit 5 + Spring/MockMvc tests in `excel-forum-backend/src/test/java/com/excel/forum/controller`. Name new tests `*Test.java` and cover request validation, status codes, and serialized responses for new endpoints.

There is no frontend test harness configured in this snapshot. For frontend changes, at minimum verify `npm run build` succeeds.

## Commit & Pull Request Guidelines
No `.git` history is present in this workspace snapshot, so no repository-specific commit convention can be inferred. Use short, imperative commit subjects, optionally scoped by module, for example: `frontend: refine practice detail layout` or `backend: validate email change payload`.

PRs should state which module changed, summarize user-visible behavior, list verification steps (`mvn test`, `npm run build`), and include screenshots for UI work.

## Security & Configuration Tips
Backend configuration is driven by `excel-forum-backend/src/main/resources/application.yml`. Prefer environment overrides for `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET`. Database schema changes must be added as new Flyway migrations under `src/main/resources/db/migration/`; do not edit historical migrations in place.
