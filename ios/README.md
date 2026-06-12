# Food Journal — iOS

Native iOS app sharing the same Supabase backend and Vercel `/api` endpoints as
the web client. See [`../IOS_PLAN.md`](../IOS_PLAN.md) for the full roadmap.

**Status:** Phase 1 (Scaffold). The app builds and launches to a placeholder
screen; auth, data, and UI land in later phases.

## Requirements

- Xcode 17+ (iOS 17 deployment target)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`
- An iOS 17+ simulator runtime (Xcode → Settings → Components)

## Setup

```sh
cd ios

# 1. Provide Supabase credentials (anon key = the publishable key the web
#    client uses in client/.env.local). Secrets.xcconfig is gitignored.
cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig
$EDITOR Config/Secrets.xcconfig

# 2. Generate the Xcode project from project.yml (the .xcodeproj is NOT
#    committed — regenerate after any project.yml change or a fresh clone).
xcodegen generate

# 3. Open and run.
open FoodJournal.xcodeproj
```

## Command-line build & test

```sh
xcodegen generate
xcodebuild -resolvePackageDependencies -project FoodJournal.xcodeproj -scheme FoodJournal

# Build for a simulator (requires an installed iOS runtime):
xcodebuild build \
  -project FoodJournal.xcodeproj -scheme FoodJournal \
  -destination 'platform=iOS Simulator,name=iPhone 16'

# Compile-check without a simulator (no runtime needed):
xcodebuild build \
  -project FoodJournal.xcodeproj -scheme FoodJournal \
  -destination 'generic/platform=iOS' -sdk iphoneos
```

## Layout

```
ios/
├── project.yml                 # XcodeGen spec (source of truth for the project)
├── Config/                     # xcconfig build settings + Secrets
│   ├── Shared / Debug / Release.xcconfig
│   ├── Secrets.example.xcconfig # committed template
│   └── Secrets.xcconfig         # gitignored — your real values
├── FoodJournal/
│   ├── App/                    # FoodJournalApp, ContentView
│   ├── Data/                   # SupabaseClientProvider (singleton + config)
│   └── Resources/              # Info.plist, Assets.xcassets
└── FoodJournalTests/
```

## Notes

- The Supabase URL + anon key flow from `Config/Secrets.xcconfig` →
  Info.plist (`$(SUPABASE_URL)` substitution) → `Bundle.main` at runtime
  (`SupabaseConfig` in `Data/SupabaseClientProvider.swift`).
- OAuth deep link: `foodjournal://auth/callback` (registered in Info.plist;
  handler stubbed in `FoodJournalApp.onOpenURL`, wired up in Phase 2).
