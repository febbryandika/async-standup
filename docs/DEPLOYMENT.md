# Deployment

The live demo, and how it was stood up. Written after the deployment it
describes, so every command here is one that actually ran.

**Live:** https://async-standup-ten.vercel.app
(`https://async-standup-febbry.vercel.app` is an alias for the same deployment.)

**Demo access:** the login page renders a **Use demo account** button. One click
signs in as `demo@example.com`, an admin of the seeded team — no signup, no
password to copy. Reaching populated data takes one click from a cold start.

## What it runs on

| Piece             | Detail                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Host              | Vercel, project `febbry/async-standup`, connected to `febbryandika/async-standup`            |
| Production branch | `main` — pushes deploy automatically                                                         |
| Database          | Neon project `async-standup` (`long-forest-62670921`), `aws-ap-southeast-1`, **Postgres 18** |
| Email             | Resend, sending as `onboarding@resend.dev`                                                   |
| Schedule          | Vercel Cron, `/api/cron/digest` at `0 0 * * *` (00:00 UTC = 09:00 JST)                       |

Local Postgres and CI both run **16-alpine** while Neon runs **18**. The
migrations applied cleanly across that gap, but it is the one version axis the
test suite does not cover.

## Environment

Set on Production and Preview. Values live in Vercel, never in the repo.

`DATABASE_URL` · `BETTER_AUTH_SECRET` · `BETTER_AUTH_URL` · `DIGEST_FROM` ·
`CRON_SECRET` · `NEXT_PUBLIC_DEMO_EMAIL` · `DEMO_PASSWORD`

Three things about this list are not obvious:

- **`DATABASE_URL` uses the pooled endpoint** (`...-pooler...`). `lib/db/index.ts`
  opens a `pg` `Pool` per serverless instance, so the pooler is what keeps a
  burst of invocations from exhausting Postgres connections.
- **`NEXT_PUBLIC_DEMO_EMAIL` and `DEMO_PASSWORD` are both set on purpose.**
  `SPEC §9` says to leave the demo variables unset "in real deploys" — this _is_
  the demo deploy. Both are required: the login page renders the demo button only
  when it can see both, and `/login` is statically prerendered, so they have to be
  present at **build** time, not just at runtime.
- **`RESEND_API_KEY` is deliberately absent from this project's variables.** It
  resolves at runtime from an account-level shared variable on the Vercel team.
  Production works, but nothing in this project's env list mentions Resend, so the
  dependency is invisible from here — if the digest ever starts returning 500 with
  `RESEND_API_KEY is not set`, that shared variable is the first place to look.

`DATABASE_URL` is also needed at build time: `lib/db/index.ts` throws at _import_
time when it is unset and `next build` imports the route modules.

## Seeding production

`scripts/seed.ts` **truncates every table it owns** before re-inserting, so the
only real hazard is pointing it at the wrong database. Two habits remove it:

```bash
DATABASE_URL='<neon url>' NODE_ENV=production SEED_ALLOW_PROD=1 \
DEMO_PASSWORD='<the value set in Vercel>' BETTER_AUTH_SECRET='<same>' \
  pnpm exec tsx scripts/seed.ts
```

- **`pnpm exec tsx`, not `pnpm db:seed`.** The npm script passes
  `--env-file-if-exists=.env`; bypassing it means the local `.env` cannot
  contribute a `DATABASE_URL` to a command that truncates.
- **Run it once without `SEED_ALLOW_PROD` first.** It should print
  `Refusing to seed a production database.` and exit non-zero. A guard nobody has
  watched fail is a guard nobody knows works.

Migrations run separately and are not destructive:

```bash
DATABASE_URL='<neon url>' pnpm db:migrate
```

## Cron verification

Run on 2026-08-18 against production. The digest is the main deliverable of this
project and is otherwise invisible, so it was verified end to end rather than
assumed.

| Step                                | Expected                 | Actual                    |
| ----------------------------------- | ------------------------ | ------------------------- |
| `GET /api/cron/digest`, no header   | 401, empty body          | 401                       |
| Same, `Authorization: Bearer wrong` | 401, empty body          | 401                       |
| Same, correct secret                | 200, a team sent         | `{"sent":1,"failed":0}`   |
| Immediately again                   | 200, everything skipped  | `{"sent":0,"failed":0}`   |
| `digest_sends`                      | one row per team per day | 2 rows, both `2026-08-18` |

The email itself arrived from `onboarding@resend.dev` with subject
`Team Standup – 2026-08-18`, blockers section above updates.

**Delivery needs a team whose every recipient is deliverable.** Without a
verified sending domain, Resend accepts only the account owner's address, and
`resend.batch.send` is atomic — one bad recipient rejects the whole payload. The
seeded team's six `@example.com` members therefore _always_ fail, which is what
an earlier invocation recorded as `{"sent":0,"failed":1}`. That is expected, not a
regression. Real delivery was proven with a temporary one-member team on a real
address, which was deleted afterwards so it would stop mailing daily.

Note what that failure leaves behind: **the claim row is committed before the
send**, so a team that fails is still marked handled for the day and is not
retried. `lib/digest.ts` says so in as many words — the row means the digest was
_handled_, not _delivered_. Verifying a fix therefore means waiting for tomorrow
or clearing the row, not re-running the cron.

To verify a real delivery again, do the same: register on the deployed app with an
address the Resend account owns, create a one-person team, post a standup, then
call the endpoint with `CRON_SECRET`.

## Cautions

- **Never point `pnpm test:e2e` at production.** The flow specs register users and
  create teams, and `sendDigests()` loops _every_ team — test teams would become
  real recipients of a real cron.
- The demo account is an admin, so `/team/settings` and invite-code regeneration
  are reachable from it. Regenerating the code invalidates the `DEMO01` that the
  seed relies on; re-running the seed restores it.
