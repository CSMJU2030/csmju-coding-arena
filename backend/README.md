# Coding Arena API

The NestJS API exposes `/api/health`, versioned resources under `/api/v1`, and
the Core Hub SSO endpoints under `/auth`.

## Local setup

From the repository root, copy `backend/.env.example` to `backend/.env`. Set
`DATABASE_URL`, `CORE_HUB_WEB_URL`, `CORE_HUB_JWKS_URL`, `CORE_HUB_ISSUER`,
`CORE_HUB_AUDIENCE`, and `SUBSYSTEM_ID` to the local environment. Keep `.env`
out of Git.

```bash
pnpm install
pnpm --dir backend exec prisma migrate deploy
pnpm --dir backend start:dev
```

For an existing local database created from the original Prisma schema before
this repository had migrations, mark that schema as the baseline once, then
apply the competition migration:

```bash
pnpm --dir backend exec prisma migrate resolve --applied 202610030000_initial
pnpm --dir backend exec prisma migrate deploy
```

Only mark the baseline as applied when the database already contains the
original `users`, `problems`, `test_cases`, and `submissions` tables. The
migrations preserve those records, map existing users to legacy identities, and
rename their display-name column.

The frontend runs at `http://localhost:3202` and the API at
`http://localhost:4202`. The frontend proxies `/api/*` and `/auth/*` to the API
so the subsystem's HttpOnly SSO cookie remains available to browser requests.

Students enter a FIFO matchmaking queue. Each match gets three distinct random
active problems with test cases, shared by both players; each round lasts ten
minutes and the first accepted solution wins the round. The first player to win
two rounds wins the match. Elo uses the standard K=32 calculation, and the
student leaderboard displays the top five rated competitors. Lecturers can
create, edit, and remove problems and their test cases; removing a problem
deactivates it so existing match history remains intact.

## Validation

```bash
pnpm --dir backend typecheck
pnpm --dir backend test
pnpm --dir backend build
```
