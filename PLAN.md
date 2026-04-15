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

## Phase 4: Polish ✅
- [x] Mobile-first responsive layout (sticky bottom input, 44px touch targets, bottom-sheet modal, safe-area insets)
- [x] Loading skeleton while Supabase fetch is in flight
- [x] Toast notifications for add/edit/delete errors (auto-dismiss 3s)

## Phase 5: Testing ✅
- [x] Playwright E2E — 7 golden-path tests (anonymous flow)
- [x] Unit tests — 20/20 passing (parser + store utilities)

## Phase 6: Deployment ✅
- [x] GitHub repository — https://github.com/wayne-folkes/food_journal
- [x] Vercel project linked to GitHub — https://foodjournal-lime.vercel.app
- [x] Environment variables set in Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [x] Add production URL to Supabase Auth + Google OAuth allowed origins
- [x] Production smoke test

## Post-MVP (Deferred)
- [ ] Compare Days view
- [ ] Multi-day history / browsing
- [ ] LLM parsing (when budget allows)
- [ ] Toast notifications on errors
- [ ] Search entries
