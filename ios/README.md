# Food Journal — iOS

Native iOS app sharing the same Supabase backend and Vercel `/api` endpoints as
the web client.

## Requirements

- Xcode 17+ with iOS 26 SDK (beta)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`
- An iOS 26 simulator runtime (Xcode → Settings → Components)
- Apple Intelligence enabled on device or simulator for on-device calorie estimation

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

# Build for a simulator:
xcodebuild build \
  -project FoodJournal.xcodeproj -scheme FoodJournal \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro'

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
│   ├── App/                    # FoodJournalApp, ContentView (tab bar)
│   ├── Auth/                   # AuthManager (Google OAuth), SignInView
│   ├── Data/
│   │   ├── MealsRepository.swift      # SwiftData sync (read path)
│   │   ├── WriteOperations.swift      # Create / edit / delete RPCs
│   │   ├── CaloriesService.swift      # On-device estimation via Foundation Models
│   │   ├── DTOs.swift                 # Supabase wire types (MealDTO, MealItemDTO)
│   │   ├── ItemHistoryStore.swift     # Recent item descriptions for autocomplete
│   │   └── SupabaseClientProvider.swift
│   ├── Models/
│   │   ├── Models.swift               # SwiftData @Model classes (Meal, MealItem)
│   │   ├── MealType.swift             # MealType enum + display helpers
│   │   └── DateHelpers.swift          # Date extension utilities
│   ├── Theme/
│   │   └── Colors.swift               # Arcade-glow semantic color palette
│   ├── Views/
│   │   ├── DayView.swift              # Day view: summary tiles + meal cards
│   │   ├── WeekView.swift             # Week view: stacked bar chart + day rows
│   │   ├── MealCardView.swift         # Per-meal card with items + calorie chips
│   │   ├── DaySummaryView.swift       # Calorie / EI summary tiles
│   │   ├── MealComposerView.swift     # Compose new meal (chip input)
│   │   ├── EditMealView.swift         # Edit existing meal
│   │   └── SearchView.swift           # Full-text search
│   └── Resources/
│       ├── Info.plist
│       └── Assets.xcassets            # App icon (1024×1024 PNG)
└── FoodJournalTests/
    └── SupabaseConfigTests.swift
```

## Notes

- Supabase credentials flow: `Config/Secrets.xcconfig` → Info.plist (`$(SUPABASE_URL)` substitution) → `Bundle.main` at runtime (`SupabaseConfig` in `SupabaseClientProvider.swift`).
- OAuth deep link: `foodjournal://auth/callback` — registered in Info.plist and handled in `FoodJournalApp.onOpenURL`.
- Calorie estimation uses `FoundationModels` (`LanguageModelSession`) with no system instructions — health/nutrition framing triggers content refusals on Apple's on-device model. The service retries batch estimation twice, then falls back to per-item estimation.
- The `.xcodeproj` is not committed. Always run `xcodegen generate` after cloning or editing `project.yml`.
