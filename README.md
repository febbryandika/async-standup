# Async Standup

[![CI](https://github.com/febbryandika/async-standup/actions/workflows/ci.yml/badge.svg)](https://github.com/febbryandika/async-standup/actions/workflows/ci.yml)

Async standup for distributed teams: post a daily update, get the team's digest by email each morning.

## Running locally

```bash
docker compose up -d
pnpm i
cp .env.example .env
pnpm dev
```

## Scripts

| Script                                                     | Purpose                           |
| ---------------------------------------------------------- | --------------------------------- |
| `pnpm dev`                                                 | Next.js dev server                |
| `pnpm build` / `pnpm start`                                | production build and serve        |
| `pnpm lint`                                                | ESLint                            |
| `pnpm typecheck`                                           | `tsc --noEmit`                    |
| `pnpm test`                                                | Vitest unit tests                 |
| `pnpm test:e2e`                                            | Playwright end-to-end tests       |
| `pnpm format` / `pnpm format:check`                        | Prettier                          |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:reset` | Drizzle schema and local database |

> This README is a placeholder. The full version — pitch, live demo, screenshots,
> architecture diagram and engineering notes — is written near the end of the
> build, from a clean clone, so the setup steps are verified.
