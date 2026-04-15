# Food Journal — Implementation Plan

## Phase 1: Scaffold ✅
- [x] Vite + React 19 + TypeScript client
- [x] ESLint 9, Vitest, Playwright config
- [x] Supabase client + env plumbing
- [x] Zustand store (localStorage ↔ Supabase)
- [x] chrono-node rule-based parser
- [x] Unit tests (20/20 passing)

## Phase 2: Anonymous Logging ✅
- [x] InputBar — text input + submit
- [x] LogList + EntryRow — chronological feed
- [x] Inline edit (EditModal) + delete
- [x] Recent chips — one-click re-log
- [x] localStorage persistence (survives refresh)

## Phase 3: Auth + Sync ✅
- [x] Google OAuth via Supabase Auth
- [x] Supabase migration (entries table + RLS)
- [x] Anonymous → Supabase sync on first sign-in
- [x] Sign-out clears local store
- [x] Bug fixes: RLS user_id default, race condition, timezone query

## Phase 4: Polish
- [ ] Mobile-first responsive layout
- [ ] Loading states (spinner while fetching from Supabase)
- [ ] Error handling (toast notifications for failed writes)

## Phase 5: Testing
- [ ] Playwright E2E — golden path (type → submit → entry appears)
- [ ] Playwright E2E — anonymous → sign-in → sync flow

## Phase 6: Deployment
- [ ] GitHub repository
- [ ] Vercel project (linked to GitHub)
- [ ] Environment variables set in Vercel dashboard
- [ ] Production smoke test

## Post-MVP (Deferred)
- [ ] Compare Days view
- [ ] Multi-day history / browsing
- [ ] LLM parsing (when budget allows)
- [ ] Toast notifications on errors
- [ ] Search entries
