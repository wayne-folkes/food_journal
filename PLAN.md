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

## Phase 7: Meal Redesign ✅
- [x] DB migration — meals + meal_items tables with meal_type enum + RLS
- [x] Chip-style MealComposer with meal type pills and time badge
- [x] MealCard with color-coded left border per meal type
- [x] Auto-suggest meal type from time of day
- [x] Auto-commit pending input on save
- [x] Edit modal reuses composer (pills + chips + time)
- [x] Date navigation with "jump to today"
- [x] Unit tests (40 passing) + E2E tests rewritten

---

## Phase 8: Quality of Life Improvements

### 8.1 — Quick Wins (independent, parallelize)

- [x] **Auto-capitalize chip text**
  - File: `MealComposer.tsx` — capitalize first letter of description in `handleChipsChange` and `commitChipText`
  - Test: `"scrambled eggs"` → `"Scrambled eggs"`

- [x] **Input hint for new users**
  - File: `MealComposer.tsx` — add `<p className="meal-composer__hint">` below ChipInput: *"Press Enter or comma to add items"*
  - File: `App.css` — style as small muted italic text; hide once `chips.length > 0`

- [x] **Meal card entrance animation**
  - File: `App.css` — `@keyframes card-in` (fade + slight upward slide) on `.meal-card`; stagger via `:nth-child()` for initial load

### 8.2 — Features (independent, parallelize)

- [x] **Day summary line**
  - New file: `components/DaySummary.tsx` — accepts `meals: MealWithItems[]`, renders *"3 meals · 8 items"*
  - File: `App.tsx` — render between `<DateNav>` and `<MealLog>`
  - File: `App.css` — `.day-summary` as centered muted text
  - Test: correct pluralization ("1 meal · 1 item" vs "3 meals · 8 items")

- [x] **Duplicate meal ("Log again")**
  - File: `MealCard.tsx` — add *"Log again"* to overflow menu, calls `onDuplicate(meal)` prop
  - File: `App.tsx` — `handleDuplicate` calls `addMeal` with same items/type but `consumed_at = now`
  - Test: E2E — log a meal → ··· → Log again → verify two cards

- [x] **Toast action button** *(prerequisite for undo delete)*
  - File: `components/Toast.tsx` — extend toast type with optional `action: { label: string; onClick: () => void }`. Render as button inside toast; clicking cancels auto-dismiss.

### 8.3 — Safety Features (depend on 8.2 toast action button)

- [x] **Undo delete**
  - File: `App.tsx` — `handleDelete`: optimistically remove meal (store in `pendingDelete` ref), show toast *"Meal deleted"* with **Undo** action. After 5s auto-dismiss, call `deleteMeal(id)`. On Undo, restore meal and cancel delete.
  - File: `store.ts` — add `removeMealLocally(id)` and `restoreMeal(meal)` actions (local state only, no Supabase)
  - Test: E2E — delete → click Undo within 5s → meal reappears

- [x] **Confirm on edit discard**
  - File: `EditMealModal.tsx` — track `isDirty` (compare chips/type/time against original). On cancel, if dirty, `window.confirm("Discard unsaved changes?")` before closing.

### 8.4 — Polish (independent, parallelize)

- [x] **Dark mode**
  - File: `index.css` — `@media (prefers-color-scheme: dark)` overriding all CSS variables with dark equivalents (`--cream: #1A1714`, `--paper: #242018`, `--ink: #EDE8E0`, etc.)
  - File: `App.css` — adjust hardcoded `rgba()` values (header backdrop, overlay) for dark
  - Test: visual check in browser devtools

- [x] **PWA manifest + icons**
  - New file: `client/public/manifest.json` — name, short_name, start_url, display: standalone, icons
  - New files: `client/public/icon.svg`, `client/public/icon-maskable.svg`
  - File: `client/index.html` — `<link rel="manifest">`, `<meta name="theme-color">`, Apple touch icon

---

### Dependency Graph

```
Phase 8.1  ──┬── Auto-capitalize
              ├── Input hint
              └── Card animation

Phase 8.2  ──┬── Day summary
              ├── Duplicate meal
              └── Toast action button ──┐
                                        │
Phase 8.3  ──┬── Undo delete ───────────┘
              └── Confirm edit discard

Phase 8.4  ──┬── Dark mode
              └── PWA manifest
```

Phases 8.1 and 8.2 are fully parallelizable internally.
Phase 8.3 waits only on toast action button (8.2).
Phase 8.4 is independent of everything.

---

## Backlog
- [ ] Compare Days view
- [ ] LLM parsing (when budget allows)
- [ ] Search across all entries
