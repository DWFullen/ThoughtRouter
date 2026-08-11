# ThoughtRouter

Capture-first personal work routing MVP.

## Quick start
1. `pnpm install`
2. `cp .env.example .env`
3. `docker compose up -d`
4. `pnpm db:migrate`
5. `pnpm dev`

Mock mode works without AI/GitHub credentials.

## Apps
- `apps/web`: mobile-first Next.js PWA capture UI
- `apps/api`: Fastify capture/review/history API

## Packages
- `@thoughtrouter/domain`: domain model, ports, capture use cases
- `@thoughtrouter/ai`: mock + OpenAI-compatible interpreters
- `@thoughtrouter/github`: mock + GitHub adapter + doctor command
- `@thoughtrouter/db`: PostgreSQL schema/migrations

## Commands
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm github:doctor`

## Security/privacy
Do not store passwords, account numbers, payment card details, SSNs, or secrets in thought text.
