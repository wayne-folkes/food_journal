# Food Journal — iOS App Plan

A forward-looking plan for bringing Food Journal to iOS as a native app that
shares the existing Supabase backend and Vercel API endpoints. Nothing here is
in flight yet; treat it as a design doc, not a sprint.

## Goals

- **Native iOS app** (iPhone first, iPad later) that reaches the same Supabase
  project and Vercel serverless endpoints as the web app.
- **Feature parity** with the web app at launch: log meals, edit, delete,
  search, day / week views, USDA calorie lookup.
- **Offline-first** — the web app already allows anonymous local use via
  localStorage + sync-on-signin. iOS needs the equivalent via a local store.
- **Zero breaking changes** for web users. Backend contracts must stay
  backward-compatible.

## Non-goals (v1)

- iPad-specific layouts (iPhone portrait is enough for v1)
- Apple Watch app
- Widgets / Live Activities / Shortcuts
- Push notifications
- HealthKit integration (future; see Deferred)

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Language | Swift 5.10+ | iOS 17+ deployment target |
| UI | SwiftUI | Matches the mobile-first feel of the web app; lets a solo dev iterate fast |
| Networking / DB | [`supabase-swift`](https://github.com/supabase/supabase-swift) | Official SDK, same RLS + RPCs as the web client |
| Auth storage | Keychain via supabase-swift | Handled automatically |
| Local store | **SwiftData** (iOS 17+) | Mirrors `meals` / `meal_items` tables; `@Model` per entity |
| State | `@Observable` + SwiftUI `@Bindable` | No Redux / no Zustand equivalent needed |
| HTTP (non-Supabase) | `URLSession` | For `/api/usda-lookup` |
| Testing | XCTest + `Testing` framework | Unit tests on the data layer, UI tests on critical flows |
| CI | GitHub Actions with macOS runners | Build + test on PR; archive + TestFlight on `main` |

## What is already ready

Nothing on the backend needs to change before iOS can start calling it:

- **Endpoints are JWT-only** — `api/usda-lookup.ts` and `api/admin/flush-cache.ts`
  authenticate via `Authorization: Bearer <jwt>`. No cookies, no Origin checks.
- **Rate limits are user-scoped** (`check_and_increment_api_rate_limit` RPC
  keyed on `user.id`), so web + iOS share the same 60/hr and 10/hr budgets.
- **RLS policies** are user-scoped and will apply identically to Swift clients.
- **RPCs exist for every mutation** the web client performs:
  `create_meal_with_items`, `update_meal_with_items`, `create_meals_with_items_batch`,
  `search_meals`, `get_recent_item_descriptions`, `get_prior_item_descriptions`.
- **Shared types live in `shared/types/database.ts`** (as of Phase 1 of the
  shared-types refactor) — a faithful source of truth for `Database.swift`.

## Prerequisites (must land before coding the app)

### P0 — Backend config (1 hr)

- [ ] In Supabase Dashboard → Auth → URL Configuration, add redirect URL
      `foodjournal://auth/callback` (custom URL scheme for the iOS app)
- [ ] Enable **Sign in with Apple** provider in Supabase Dashboard
      (required by App Store review once you offer any third-party sign-in)
- [ ] Create the Apple Service ID in the Apple Developer portal and
      wire its client ID + secret into Supabase's Apple provider
- [ ] Verify Google OAuth provider allows the iOS client ID (needs a second
      entry; Google treats iOS and web as distinct OAuth clients)

### P1 — Shared contract (Phase 2 of shared-types refactor, ~4 hrs)

- [ ] Hand-write `shared/types/Database.swift` mirroring `database.ts`
- [ ] Add CI drift check: regenerate TS types from Supabase and diff against
      `shared/types/database.ts`; fail on mismatch
- [ ] Add shallow Swift drift check: Node script that extracts type names +
      fields from `database.ts` and greps for matching decls in `Database.swift`
- [ ] Document in `shared/types/README.md`: regen commands + the
      "never remove an RPC arg, only add optional" rule

## Phase breakdown

### iOS Phase 1 — Scaffold (1 day)

- [ ] Create Xcode project `FoodJournal.xcodeproj` under `ios/`
- [ ] Bundle ID `com.waynefolkes.foodjournal` (or final choice)
- [ ] Add `supabase-swift` via SPM
- [ ] Import `shared/types/Database.swift` into the Xcode project as a file
      reference (so edits in either place sync)
- [ ] Info.plist: URL scheme `foodjournal`, NSAppTransportSecurity defaults
- [ ] Wire `SupabaseClient` singleton with URL + anon key via `.xcconfig` files
      (one per `Debug` / `Release` build config; don't hard-code)
- [ ] CI: add a GitHub Actions job that runs `xcodebuild test` on a macOS
      runner on every PR touching `ios/`

### iOS Phase 2 — Auth (1 day)

- [ ] Sign in with Apple button using `AuthenticationServices`
- [ ] Sign in with Google via `ASWebAuthenticationSession` + Supabase PKCE flow
- [ ] Handle deep link back to `foodjournal://auth/callback` in `SceneDelegate` /
      `onOpenURL` modifier
- [ ] Sign-out clears Keychain + local SwiftData store
- [ ] "Continue without account" path stays local-only (see Phase 4 for sync)

### iOS Phase 3 — Read path (2 days)

- [ ] SwiftData models: `Meal`, `MealItem`, `MealType` enum
- [ ] `MealsRepository` actor that owns all Supabase + SwiftData I/O
- [ ] `loadDay(date:)` — fetch from Supabase, upsert into SwiftData, return
      the SwiftData query for SwiftUI to observe
- [ ] Day view: date nav bar, `DaySummary` (total calories, item count), meal log
- [ ] Week view: 7-column grid with meal dots, tap to navigate to day
- [ ] Search sheet: debounced query → `search_meals` RPC

### iOS Phase 4 — Write path + offline (2 days)

- [ ] MealComposer sheet: chip input, meal-type pills, time picker
- [ ] Autocomplete: read from `itemHistory` (prefetched via
      `get_recent_item_descriptions` RPC on sign-in), same prefix-first ranking
- [ ] Edit meal sheet (pre-populated)
- [ ] Delete with undo toast (iOS: Snackbar-equivalent via `.alert` or custom)
- [ ] Offline queue: when offline, write to SwiftData with `pendingSync: true`;
      background task flushes via `create_meals_with_items_batch` when online
- [ ] Sign-in sync: if anonymous user has local-only meals, flush them to
      Supabase on first sign-in (mirror of `syncLocalToRemote` in web store)

### iOS Phase 5 — USDA calorie lookup (0.5 day)

- [ ] `CaloriesLookupService` that calls `POST /api/usda-lookup` with JWT
- [ ] Auto-trigger after meal save for items with `calories == nil` (same
      UX as the web app)
- [ ] Manual "Estimate calories" action on meal cards
- [ ] Handle 429 (rate limit) with a user-facing toast

### iOS Phase 6 — Polish (1 day)

- [ ] Haptic feedback on commit chip, on save, on delete
- [ ] Swipe actions on meal cards (edit / duplicate / delete)
- [ ] Pull-to-refresh on day view
- [ ] Empty states with illustration
- [ ] Dark mode audit (SwiftUI does most of it; verify custom colors)
- [ ] Dynamic Type support (no hard-coded font sizes)
- [ ] VoiceOver labels on all interactive elements

### iOS Phase 7 — Ship (2 days, mostly waiting)

- [ ] App Store Connect app record + metadata
- [ ] Screenshots for iPhone 6.7" and 6.1"
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) declaring Supabase + USDA API
- [ ] App Store privacy labels (Contact Info: email via auth; User Content: meals)
- [ ] TestFlight internal build → smoke test on a real device
- [ ] External TestFlight round with 5–10 testers
- [ ] Submit for review

**Total engineering time: ~8 working days** plus waiting for App Review (1–3 days typical).

## Repository layout (proposed)

```
food_journal/
├── client/                  # web (existing)
├── api/                     # Vercel functions (existing)
├── shared/
│   ├── types/
│   │   ├── database.ts      # TS source of truth
│   │   └── Database.swift   # Swift counterpart (Phase 2 of types refactor)
│   └── usda-lookup.ts
├── ios/
│   ├── FoodJournal.xcodeproj
│   ├── FoodJournal/
│   │   ├── App/
│   │   ├── Features/        # MealLog, Composer, Search, Week
│   │   ├── Data/            # Repository, SwiftData models, Supabase client
│   │   └── Resources/
│   └── FoodJournalTests/
└── supabase/migrations/     # shared between web + iOS
```

## Risks & open questions

1. **SwiftData is iOS 17+.** If you need to support iOS 16, fall back to Core
   Data or GRDB. Current bet: iOS 17+ is fine for a personal project launching
   in 2026.

2. **`supabase-swift` realtime subscriptions are less battle-tested than the JS
   SDK.** The web app doesn't use realtime today, so this isn't a v1 risk —
   just flagging it if we ever add live multi-device sync.

3. **Apple Sign In + Supabase + existing Google users.** If a user signed up
   via Google on the web, then signs in with Apple on iOS, Supabase treats
   them as two different accounts. Mitigation: require email linking at
   sign-in, or make the first iOS sign-in flow prompt "link to existing
   account?" Decision deferred to Phase 2.

4. **Offline write conflict resolution.** If the same meal is edited on web
   and iOS while iOS is offline, which wins? Simplest policy: last-write-wins
   by `updated_at`. Matches what the web app already does implicitly.

5. **USDA API latency from mobile networks.** Current timeout is the Vercel
   default (~10s). Consider client-side abort + retry after 5s to keep the
   UI responsive on spotty LTE.

6. **App size / startup time.** Stay under 50MB download; aim for <1s cold
   start. `supabase-swift` is small, SwiftData is system, SwiftUI is system —
   shouldn't be an issue, but measure before shipping.

## Deferred (post-v1)

- **HealthKit integration** — write meals as dietary records; pull weight /
  workout data to correlate (high value, but HealthKit auth UX is its own mini-project)
- **Widgets** — "today's calorie total" lock-screen widget
- **Shortcuts** — "Log breakfast: oatmeal, coffee" via Siri
- **Apple Watch complication** — quick-log a drink / snack
- **iPad layout** — three-column navigation with week view always visible
- **Photo attachments** — take a photo of a meal; store in Supabase Storage
- **LLM-powered parsing** — "had a chicken burrito from chipotle" → structured items
  (blocked on LLM budget; see user_stack_preferences memory)

## Decision log

- **2026-04-16:** Chose SwiftUI over UIKit. Reason: solo dev, modern stack,
  faster iteration. Trade-off: less fine-grained control over edge-case
  animations, but none of the current UX needs it.
- **2026-04-16:** Chose SwiftData over Core Data. Reason: less boilerplate,
  `@Model` macro handles the boring bits. Trade-off: iOS 17+ only.
- **2026-04-16:** Chose to share `shared/types/Database.swift` as a file
  reference in the Xcode project (not a Swift Package) so the Phase 2 drift
  check can diff it against `database.ts` without worrying about package
  resolution.
