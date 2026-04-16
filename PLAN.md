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

## Phase 9: Search + Calories

### 9.1 — Calorie Schema (must go first)

- [x] **DB migration: add calories column**
  - Supabase SQL: `ALTER TABLE meal_items ADD COLUMN calories smallint;`
  - File: `types/database.ts` — add `calories: number | null` to `MealItem`, `MealItemInsert`
  - No store changes needed — column comes back for free in existing `select('*, meal_items(*)')` join

### 9.2 — Calorie Input UI (depends on 9.1)

- [x] **Inline calorie editing on MealCard**
  - File: `MealCard.tsx` — each item row gets a tappable calorie badge: shows `— cal` when null, `150 cal` when set. Tap opens a small inline `<input type="number">` (or popover). Blur/Enter saves.
  - File: `App.css` — `.meal-card__cal` badge style: pill-shaped, muted when empty, sage-colored when filled
  - Keep it minimal: no calorie input in MealComposer — calories are added after the meal is logged

- [x] **Save calorie to Supabase**
  - File: `store.ts` — new action `updateItemCalories(itemId: string, calories: number | null)` — calls `supabase.from('meal_items').update({ calories }).eq('id', itemId)`, updates local state
  - Optimistic update: set locally first, rollback on error + toast

- [x] **Meal calorie subtotal**
  - File: `MealCard.tsx` — below the items list, show sum: *"420 cal"* (only when ≥1 item has calories). If some items are missing calories, show *"~420 cal"* with a tooltip/title explaining it's partial

### 9.3 — Day calorie total (depends on 9.2)

- [x] **Day summary with calories**
  - File: `DaySummary.tsx` — extend to show *"3 meals · 8 items · 1,420 cal"*. Only show calorie segment when ≥1 item across the day has calories. Use `~` prefix when any items are missing calories.

### 9.4 — Calorie editing in EditMealModal (depends on 9.2)

- [x] **Calorie field in edit modal**
  - File: `EditMealModal.tsx` — each chip in the edit list gets an optional calorie input beside it
  - On save, update `meal_items.calories` for each changed item
  - Track calorie changes in `isDirty` check

### 9.5 — Search (independent of 9.1–9.4, parallelize)

- [x] **Search icon + expandable bar**
  - File: `App.tsx` — add search icon button in header. Clicking toggles a `SearchOverlay` component.
  - New file: `components/SearchOverlay.tsx` — full-screen overlay with autofocused text input, debounced 300ms
  - File: `App.css` — `.search-overlay` slide-down animation, input styling consistent with app theme

- [x] **Search query + results**
  - File: `store.ts` — new action `searchItems(query: string): Promise<MealWithItems[]>` — calls `supabase.from('meals').select('*, meal_items!inner(*)').ilike('meal_items.description', '%query%').order('consumed_at', { ascending: false }).limit(50)`
  - For anonymous users: filter local meals in-memory with `item.description.toLowerCase().includes(query)`

- [x] **Search results display**
  - File: `SearchOverlay.tsx` — results grouped by date (date header + MealCards). Matching item text highlighted (bold/underline). Empty state: *"No meals found"*. Tap a result → close search, navigate to that date.

- [x] **Keyboard / mobile UX**
  - Escape key or back button closes search
  - Search input gets `inputmode="search"` + `enterkeyhint="search"` for mobile keyboards
  - Results are scrollable, overlay traps focus

---

### Dependency Graph

```
Phase 9.1  ── Calorie column migration
                │
Phase 9.2  ──┬── Inline calorie editing ──────────┐
              └── Save to Supabase + optimistic     │
                                                    │
Phase 9.3  ── Day summary calories ─────────────────┘
                                                    │
Phase 9.4  ── Edit modal calorie field ─────────────┘

Phase 9.5  ──┬── Search overlay + bar       (independent)
              ├── Search query + results
              └── Keyboard / mobile UX
```

9.5 (search) can run fully in parallel with 9.1–9.4 (calories).
Within calories: 9.1 → 9.2 → 9.3/9.4 (9.3 and 9.4 can parallelize).

---

## Phase 10: USDA Calorie Lookup

### Overview
Auto-fill calorie estimates using the free USDA FoodData Central API via a Vercel serverless function. Cached in a `food_lookup` table so repeat queries skip the API entirely. User can always override.

### 10.1 — Vercel API setup (must go first)

- [x] **Create `api/` directory + serverless function scaffold**
  - New file: `api/usda-lookup.ts` — Vercel serverless function (Node.js runtime)
  - Request: `POST { items: [{ id: string, description: string }] }`
  - Response: `{ results: [{ id: string, description: string, calories: number | null, source: string }] }`
  - Auth: validate Supabase JWT from `Authorization: Bearer <token>` header using `@supabase/supabase-js` `getUser()` — reject unauthenticated requests
  - Env vars needed in Vercel: `USDA_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

- [x] **USDA API integration**
  - Endpoint: `POST https://api.nal.usda.gov/fdc/v1/foods/search`
  - Body: `{ query: description, dataType: ["Foundation", "SR Legacy"], pageSize: 1 }`
  - Prefer Foundation + SR Legacy datasets (generic foods, not branded products)
  - Extract calories: find nutrient with `number === 208` (Energy, kcal) in `foodNutrients` array
  - Calories are per 100g — return raw value with a note (future: portion estimation)
  - Rate limit: 1,000 req/hr — batch items in a single serverless call to minimize API hits

- [x] **Register USDA API key**
  - Sign up at `https://fdc.nal.usda.gov/api-key-signup`
  - Add `USDA_API_KEY` to Vercel env vars

### 10.2 — Cache table (must go first, parallel with 10.1)

- [x] **DB migration: `food_lookup` table**
  ```sql
  CREATE TABLE food_lookup (
    description_key  text PRIMARY KEY,     -- normalized: lowercase, trimmed
    description      text NOT NULL,        -- original casing for display
    calories_per_100g smallint,            -- kcal per 100g (USDA standard)
    source           text NOT NULL DEFAULT 'usda',  -- 'usda' | 'llm' | 'manual'
    usda_fdc_id      integer,             -- FDC ID for provenance
    created_at       timestamptz NOT NULL DEFAULT now()
  );

  -- No RLS — this is shared/public read data
  ALTER TABLE food_lookup ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Anyone can read food_lookup"
    ON food_lookup FOR SELECT USING (true);
  CREATE POLICY "Service role can insert food_lookup"
    ON food_lookup FOR INSERT WITH CHECK (true);
  ```
  - File: `types/database.ts` — add `FoodLookup` type

- [x] **Cache-first logic in `api/usda-lookup.ts`**
  - For each item: check `food_lookup` by `description_key = lower(trim(description))`
  - Cache hit → return cached calories, skip USDA call
  - Cache miss → call USDA → insert result into `food_lookup` → return
  - Use Supabase service role client (bypasses RLS for writes)

### 10.3 — Client integration (depends on 10.1 + 10.2)

- [x] **Auto-lookup on meal save**
  - File: `store.ts` or `App.tsx` — after `addMeal()` succeeds, fire off a background call:
    ```ts
    const itemsWithoutCal = meal.items.filter(i => i.calories === null)
    if (itemsWithoutCal.length > 0 && isAuthed) {
      fetch('/api/usda-lookup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsWithoutCal.map(i => ({ id: i.id, description: i.description })) })
      })
    ```
  - On response: update each item's calories in the store + optimistic local update
  - Show a brief toast: *"Estimated calories from USDA"*
  - Non-blocking: don't await this during save, fire and update when ready

- [x] **"Estimate calories" button on MealCard**
  - File: `MealCard.tsx` — new button in the card footer (near the calorie subtotal area)
  - Only shows when ≥1 item has null calories AND user is authed
  - Calls the same `/api/usda-lookup` endpoint
  - Loading state on button while fetching
  - On success, update item calories in store

- [x] **Visual indicator for estimated vs manual calories**
  - File: `MealCard.tsx` — when calories came from auto-lookup (not yet user-edited), show a subtle `~` prefix or different badge color to indicate "estimate"
  - User editing a calorie removes the estimate indicator

### 10.4 — Vercel config updates (parallel with 10.1)

- [x] **Update `vercel.json`**
  - Add API rewrites so `/api/*` routes to serverless functions while SPA catch-all still works
  ```json
  {
    "buildCommand": "cd client && npm install && npm run build",
    "outputDirectory": "client/dist",
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

- [x] **Root `package.json` for API dependencies**
  - New file: `package.json` — minimal, with `@supabase/supabase-js` as dependency (needed by the serverless function)
  - Update `.gitignore` if needed

---

### Dependency Graph

```
Phase 10.1  ── API function scaffold ──────┐
                                            │
Phase 10.2  ── food_lookup table ──────────┤
                                            │
Phase 10.4  ── vercel.json + root pkg ─────┤
                                            │
Phase 10.3  ── Client integration ─────────┘
              ├── Auto-lookup on save
              └── "Estimate" button on MealCard
```

10.1, 10.2, and 10.4 can all run in parallel.
10.3 depends on all three.

---

### Open questions for future
- Calories are per 100g — adding portion size estimation (LLM or manual weight input) is a natural follow-up
- When LLM lookup is added, it becomes another `source` value in `food_lookup` and a second `api/llm-estimate.ts` function

---

## Phase 11: Weekly View

### Overview
A dedicated weekly view showing all meals grouped by day, with stats: most consumed items, meal pattern grid, new-to-you items, and total items count. Toggled from the existing DateNav.

### 11.1 — Week data loading (must go first)

- [ ] **`loadWeek` store action**
  - File: `store.ts` — add `loadWeek(startDate: string): Promise<MealWithItems[]>` to `MealsState`
  - For authed: query `meals` + `meal_items(*)` where `consumed_at` between Monday 00:00 and Sunday 23:59:59 of the given week
  - For anon: filter local `meals` array by the same date range
  - Returns the full week of meals (does NOT replace the `meals` state — stored separately)
  - Add `weekMeals: MealWithItems[]` and `weekLoading: boolean` to the store

- [ ] **`loadPriorItems` for "new this week" detection**
  - File: `store.ts` — add `loadPriorItems(beforeDate: string): Promise<Set<string>>` 
  - For authed: `select distinct lower(description) from meal_items join meals on ... where consumed_at < weekStart`
  - Returns a Set of normalized description strings logged before this week
  - Can use a simple RPC or just `supabase.from('meal_items').select('description, meals!inner(consumed_at)').lt('meals.consumed_at', weekStart)`

### 11.2 — Week navigation (depends on 11.1)

- [ ] **View toggle in DateNav**
  - File: `DateNav.tsx` — add a "Day | Week" toggle (two small pills/tabs) in the header area
  - When "Week" is selected: arrows navigate by 7 days, label shows "Apr 7 – 13" format
  - File: `App.tsx` — add `viewMode: 'day' | 'week'` state. When `viewMode === 'week'`, call `loadWeek` instead of `loadDay`, render `WeekView` instead of `MealLog`
  - `selectedDate` continues to anchor the view — in week mode it determines which week to show (week containing that date)

### 11.3 — WeekView component (depends on 11.1, parallel with 11.2)

- [ ] **New file: `components/WeekView.tsx`**
  - Props: `weekMeals: MealWithItems[]`, `weekStart: string`, `isLoading: boolean`
  - Layout: stats cards at top, then day-by-day meal list below

- [ ] **Day-by-day meal list**
  - Group `weekMeals` by date (local timezone)
  - Each day: date header ("Monday, Apr 7") + compact MealCards
  - Days with no meals: show a muted "No meals logged" row
  - MealCards are **read-only** in this view (no edit/delete/duplicate — that's the day view's job). Tapping a day header navigates to that day in day view.

### 11.4 — Stats cards (depends on 11.1, parallelize internally)

- [ ] **Most consumed items**
  - File: `WeekView.tsx` — count occurrences of each `item.description` (case-insensitive) across the week
  - Display top 5 as: "Eggs × 5, Coffee × 4, Rice × 3"
  - Style: ranked list, count badge on the right

- [ ] **Meal pattern grid**
  - File: `WeekView.tsx` — 7 rows (Mon–Sun) × 4 columns (B/L/D/S)
  - Each cell: filled dot (has a meal of that type) or empty circle (no meal)
  - Color-coded using existing meal-type colors (`--meal-breakfast`, `--meal-lunch`, etc.)
  - Shows at a glance: "I skipped breakfast 3 days this week"

- [ ] **New items this week**
  - File: `WeekView.tsx` — compare this week's item descriptions against `priorItems` Set from 11.1
  - Display items that don't appear in prior history: "🆕 Quinoa, Mango lassi, Tempeh"
  - If none: "No new foods this week"

- [ ] **Total items logged**
  - File: `WeekView.tsx` — simple count of all `meal_items` across the week
  - Display: "42 items logged this week"

### 11.5 — CSS (parallel with 11.3/11.4)

- [ ] **WeekView styles**
  - File: `App.css`
  - `.week-view` container
  - `.week-stats` — grid or flex row of stat cards, scrollable horizontally on mobile
  - `.week-stat-card` — rounded card with label + value, subtle background
  - `.meal-pattern-grid` — CSS grid 7×4, small dots, gap between cells
  - `.meal-pattern-grid__dot--filled` / `--empty` — colored vs muted circles
  - `.week-day-group` — day sections with header + compact meal list
  - `.week-top-items` — ranked list with count badges
  - `.week-new-items` — tag/chip style for each new food
  - `.view-toggle` — pill tabs for Day|Week in DateNav

---

### Dependency Graph

```
Phase 11.1  ── loadWeek + loadPriorItems ──────┐
                                                │
Phase 11.2  ── Week navigation (DateNav) ──────┤
                                                │
Phase 11.3  ── WeekView component ─────────────┤
                                                │
Phase 11.4  ──┬── Most consumed items          │
              ├── Meal pattern grid     ────────┘
              ├── New items this week
              └── Total items logged

Phase 11.5  ── CSS (parallel with 11.3/11.4)
```

11.1 must go first (data layer).
11.2, 11.3, 11.4, 11.5 can all progress in parallel once 11.1 is done.
Within 11.4 all four stat cards are independent.

---

## Backlog
- [ ] Compare Days view
- [ ] LLM parsing + calorie estimation (when budget allows)
- [ ] Portion size estimation (pair with USDA per-100g values)
