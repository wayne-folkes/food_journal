# Food Journal

A fast food logging web app. Log what you eat with natural language input.

## Stack

- **Client**: React 19 + Vite + TypeScript, vanilla CSS
- **Auth + DB**: Supabase (Google OAuth, Postgres + RLS)
- **State**: Zustand with localStorage for anonymous users

## Setup

### 1. Supabase — run the migration

In your Supabase dashboard, go to **SQL Editor** and run the contents of:
```
supabase/migrations/0001_init.sql
```

This creates the `entries` table and sets up Row Level Security.

### 2. Supabase — enable Google OAuth

1. In Supabase Dashboard → **Authentication → Providers → Google** → toggle on
2. You'll need a Google OAuth Client ID and Secret. Create one at:
   **Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised JavaScript origins: `http://localhost:5173`
   - Authorised redirect URIs: copy the **Callback URL** shown in the Supabase Google provider settings (looks like `https://your-project.supabase.co/auth/v1/callback`)
3. Paste the Client ID and Secret back into Supabase.

### 3. Client — environment variables

```bash
cd client
cp .env.example .env.local
```

Fill in `.env.local`:
```
VITE_SUPABASE_URL=https://kbdtcoyrspyjqjsgkwjl.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key from Supabase Dashboard → Project Settings → API>
```

### 4. Run the dev server

```bash
cd client
npm install   # if you haven't already
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

From `client/`:

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |

## Project structure

```
food_journal/
├── client/
│   ├── src/
│   │   ├── components/     # InputBar, LogList, EntryRow, EditModal, RecentChips, AuthButton
│   │   ├── lib/
│   │   │   ├── supabase.ts # Supabase client instance
│   │   │   ├── parser.ts   # chrono-node time extraction
│   │   │   └── store.ts    # Zustand store (localStorage ↔ Supabase)
│   │   └── types/
│   │       └── database.ts # Supabase table types
│   └── e2e/                # Playwright tests
├── supabase/
│   └── migrations/         # SQL run against your Supabase project
└── README.md
```
