# webpage Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-05

## Active Technologies
- TypeScript on Node.js 20 LTS (`node20` pkg on FreeBSD 14) + Hono 4.x + @hono/node-server, Eta 3.x (existing); `mysql2` ^3.x, `dotenv` ^16.x (new) (002-register-account)
- MySQL 5.x/8.x via `mysql2/promise` connection pool; stored procedure access only (002-register-account)

- TypeScript on Node.js 20 LTS (`node20` pkg on FreeBSD 14) + Hono 4.x + @hono/node-server, Eta 3.x, Tailwind CSS 3.x (build-time only) (001-homepage-scaffold)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript on Node.js 20 LTS (`node20` pkg on FreeBSD 14): Follow standard conventions

## Recent Changes
- 002-register-account: Added TypeScript on Node.js 20 LTS (`node20` pkg on FreeBSD 14) + Hono 4.x + @hono/node-server, Eta 3.x (existing); `mysql2` ^3.x, `dotenv` ^16.x (new)

- 001-homepage-scaffold: Added TypeScript on Node.js 20 LTS (`node20` pkg on FreeBSD 14) + Hono 4.x + @hono/node-server, Eta 3.x, Tailwind CSS 3.x (build-time only)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
