# Food Journal

A meal logging web app. Log meals with chip-style input, auto-estimated calories, and weekly stats.

Live at **[food.folkes.dev](https://food.folkes.dev)**

## Screenshots

<table>
  <tr>
    <td align="center"><strong>Home</strong></td>
    <td align="center"><strong>Day View</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/01-home.png" width="200" alt="Home screen showing the meal composer with meal type pills and empty log" /></td>
    <td><img src="docs/screenshots/02-day-view.png" width="200" alt="Day view with two logged meals and recent item chips" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Week View</strong></td>
    <td align="center"><strong>Search</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/04-week-view.png" width="200" alt="Week view showing item count, most logged items, and new this week chips" /></td>
    <td><img src="docs/screenshots/05-search.png" width="200" alt="Search overlay with highlighted keyword match in results" /></td>
  </tr>
</table>

## Stack

- **Client**: React 19 + Vite + TypeScript, vanilla CSS
- **Auth + DB**: Supabase (Google OAuth, Postgres + RLS)
- **State**: Zustand with localStorage (anonymous) ↔ Supabase (signed in)
- **API functions**: Vercel serverless (Node.js) — USDA calorie lookup
- **Calorie data**: USDA FoodData Central API (free, cached in `food_lookup` table)

## Setup

### 1. Supabase — run migrations

In your Supabase dashboard → **SQL Editor**, run each file in order:

```
supabase/migrations/0001_init.sql       -- legacy entries table (unused)
supabase/migrations/0002_meals.sql      -- meals + meal_items tables + RLS
supabase/migrations/0003_meal_items_calories.sql  -- calories column
supabase/migrations/0004_food_lookup.sql           -- USDA cache table
supabase/migrations/0005_sync_meals_schema.sql     -- raw_input + updated_at on meals
supabase/migrations/0006_transactional_meal_writes.sql -- transactional meal RPCs
supabase/migrations/0007_batch_sync_local_meals.sql -- batched local-to-remote sync RPC
supabase/migrations/0008_search_meals_rpc.sql      -- search RPC + trigram index
```

After running `0007` and `0008`, verify the new SQL objects exist:

```sql
select proname
from pg_proc
where proname in ('create_meals_with_items_batch', 'search_meals')
order by proname;

select indexname
from pg_indexes
where schemaname = 'public'
   and tablename = 'meal_items'
   and indexname = 'meal_items_description_trgm';
```

Expected result:
- both RPC names are returned from `pg_proc`
- the `meal_items_description_trgm` index is returned from `pg_indexes`

### 2. Supabase — enable Google OAuth

1. Dashboard → **Authentication → Providers → Google** → toggle on
2. Create OAuth credentials at **Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Type: **Web application**
   - Authorised origins: `http://localhost:5173` and your production URL
   - Redirect URI: the Callback URL shown in Supabase Google provider settings
3. Paste Client ID and Secret back into Supabase
4. Add your production domain to **Authentication → URL Configuration → Redirect URLs**

### 3. Client — environment variables

```bash
cd client
cp .env.example .env.local
```

Fill in `client/.env.local`:
```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Project Settings → API>
```

### 4. Vercel API — environment variables

The `/api/usda-lookup` serverless function needs these set in your Vercel project settings:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (service_role) |
| `USDA_API_KEY` | Sign up free at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup) |

### 5. Run the dev server

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> **Note:** The `/api/usda-lookup` serverless function only runs in Vercel's environment. Calorie estimation won't work locally unless you run `vercel dev` from the repo root.

## Scripts

From `client/`:

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests (requires `npx playwright install`) |

## CI

GitHub Actions runs **lint**, **unit tests**, and **build** on every push to `main` and on every pull request. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Project structure

```
food_journal/
├── api/
│   ├── usda-lookup.ts      # Vercel serverless: USDA calorie lookup + cache
│   └── admin/
│       └── flush-cache.ts  # Admin-only: flush food_lookup cache
├── client/
│   ├── src/
│   │   ├── components/     # MealComposer, MealCard, MealLog, SearchOverlay, ...
│   │   └── lib/
│   │       ├── supabase.ts     # Supabase client
│   │       ├── store.ts        # Zustand store
│   │       ├── analytics.ts    # Typed Vercel Analytics event wrapper
│   │       ├── parser.ts       # chrono-node chip parsing
│   │       ├── mealType.ts     # meal type suggestion by time of day
│   │       └── caloriesLookup.ts  # client-side USDA fetch helper
│   └── e2e/                    # Playwright E2E tests
├── shared/
│   ├── types/
│   │   └── database.ts     # Supabase table + RPC types (shared by client + api)
│   └── usda-lookup.ts      # Shared lookup request/response types
├── supabase/
│   └── migrations/         # SQL migrations (run in order)
└── vercel.json             # Build config + API rewrites
```

## Database schema

```
meals          — one record per eating occasion (meal_type, consumed_at, user_id)
                 plus raw_input and updated_at metadata used by the app
  └── meal_items — food items within a meal (description, calories, position)

food_lookup    — shared USDA calorie cache (description_key, calories_per_100g)
```

## Features

- **Chip-style meal composer** — type items separated by Enter or comma
- **Meal types** — Breakfast / Lunch / Dinner / Snack / Dessert / Drink, auto-suggested by time
- **Color-coded meal cards** — distinct accent color per meal type
- **Date navigation** — browse any past day
- **Calorie tracking** — manual entry or auto-estimated from USDA FoodData Central
- **Search** — full-text search across all logged items
- **Dark mode** — respects system preference
- **PWA** — installable on mobile (Add to Home Screen)
- **Undo delete** — 5-second grace period after deleting a meal
