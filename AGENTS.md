# Agents Guide

Operational instructions for AI agents (Claude Code and friends) working in
this repo. Read this before making non-trivial changes.

## Project snapshot

- **Web app:** React 19 + Vite + TypeScript (`client/`), Zustand store,
  vanilla CSS, mobile-first
- **Backend:** Supabase (auth + Postgres + RLS) + Vercel serverless functions
  (`api/`) for USDA calorie proxy and admin endpoints
- **Shared:** `shared/types/database.ts` is the single source of truth for
  domain types. `shared/usda-lookup.ts` holds the lookup request/response
  contract. Anything domain-shaped that both the client and the API consume
  belongs in `shared/`.
- **Future:** A native iOS app is planned (see `IOS_PLAN.md`). It will
  reuse the same Supabase project, the same Vercel endpoints, and the same
  `shared/` contracts.

## Core rules

### 1. Design every new feature to be iOS-compatible

The iOS app is not shipped yet, but **new backend and contract decisions
should assume it will exist**. Specifically:

- **Keep endpoint auth JWT-only.** Do not introduce cookie-based auth,
  same-origin assumptions, or Origin-header allowlists on `/api/*` routes.
  Native apps don't send `Origin` and don't manage cookies the same way.
- **No web-only globals in shared code.** `shared/` must not import
  `window`, `document`, `localStorage`, Vite env vars, or React. If a type
  or function lives in `shared/`, it needs to be consumable by a Swift
  translator later.
- **RPC contracts are forever.** Once an RPC (e.g. `create_meal_with_items`)
  has shipped, **never rename, remove, or change the type of an argument**.
  Only add new optional arguments. Rename? Create a new RPC. This is the
  mobile-compat guarantee — iOS versions in the wild will call old RPCs
  long after the web has moved on.
- **Rate limits keyed on `user.id`,** not on IP or Origin. `check_and_increment_api_rate_limit`
  already does this; preserve that pattern for any new rate-limited endpoints.
- **Auth redirect URLs:** when touching OAuth config, remember that
  `foodjournal://auth/callback` will eventually be in the allow-list.
  Don't remove it if you see it.

### 2. Flag high-cost iOS-compat decisions — don't absorb them silently

If you're about to make a choice where "stay iOS-compatible" would add
significant effort (rough rule: **more than ~30 minutes of extra work**,
or any architectural divergence from the plan in `IOS_PLAN.md`), **stop
and surface it to the user** before proceeding. Phrase it like:

> "The straightforward implementation uses X, which doesn't translate
> cleanly to iOS. Making it iOS-ready would mean Y, costing Z extra effort.
> Want me to pay that cost now, or ship the web-only version and deal with
> it when iOS lands?"

Examples of things worth flagging:

- Using a browser-only API (e.g. `IndexedDB`, `BroadcastChannel`, Service
  Workers) for meaningful functionality
- Introducing a new `/api/*` endpoint that depends on session cookies
- Adopting a third-party service that lacks a Swift SDK
- Schema changes that would force a breaking RPC change (and therefore a
  coordinated web + iOS release)
- Pushing domain logic into React components that would need to be
  re-implemented in SwiftUI — prefer moving such logic into `shared/` or
  into a pure TS module in `client/src/lib/` that has a clear Swift analogue

Examples of things **not** worth flagging (just do the web-native thing):

- Using React / SwiftUI for UI — different by nature, no shared code expected
- Using browser animation libraries for web-only UI polish
- Using `localStorage` in the Zustand `persist` middleware — iOS uses its
  own SwiftData store, so this is already a known boundary

### 3. Keep `shared/` language-neutral in spirit

TypeScript is the authoring language, but a human should be able to read
`shared/types/database.ts` and hand-translate it to Swift mechanically.
That means:

- Prefer plain interfaces, unions of string literals, and flat structs
- Avoid TS-only features in shared types: conditional types, mapped types,
  `infer`, deeply-generic helpers
- Avoid runtime code in `shared/` unless the logic is genuinely portable
  (e.g. date-string math is fine; using `chrono-node` is not)

### 4. Testing expectations

- The `npm test` suite (`vitest`) must pass before committing
- `npm run build` must produce a clean production build (tsc + vite both)
- Playwright E2E is not gated on every commit, but don't break it either
- Supabase migrations go in `supabase/migrations/NNNN_description.sql`
  with a sequential prefix; the CI schema-drift job compares local file
  count to the Supabase Management API

### 5. Commits

- Follow existing commit message style (see `git log` — conventional
  prefix like `feat:` / `fix:` / `refactor:` / `chore:`)
- Always include the `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
  trailer on agent-authored commits
- Only commit when the user asks you to

## Files to read before significant changes

- `PLAN.md` — phased implementation history and current state
- `IOS_PLAN.md` — forward-looking iOS plan and design decisions
- `shared/types/database.ts` — domain types + RPC contracts
- `supabase/migrations/` — current schema (read the most recent few)

## How to surface iOS-compat concerns

When in doubt, say something like:

> "Heads up: doing this the web-native way uses [thing]. Porting this to
> iOS later would cost roughly [estimate]. See `IOS_PLAN.md` — this would
> diverge from [section]. Do you want to (a) pay the compat cost now,
> (b) document the divergence and decide later, or (c) ship web-only and
> accept the duplication?"

Short, specific, offers options. Don't editorialize; let the user decide.
