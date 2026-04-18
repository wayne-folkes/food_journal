# Handoff: Food Journal — Editorial × iOS

## Overview

A mobile food diary app with an editorial/magazine personality. Users log meals by writing a single sentence; the app parses it into individual items. The visual language borrows from pocket magazines — Playfair Display italic headlines, drop caps, hairline rules, small-caps kickers, and tonal striped tiles instead of food photography.

## About the Design Files

The files in this bundle (`Food Journal — Editorial × iOS.html`, `editorial-ios.jsx`, `editorial-ios-screens.jsx`) are **HTML prototypes — design references only**. They are not production code. Your task is to **recreate these designs in your existing web or native app codebase**, using its established component libraries, routing, and state management patterns. If no codebase exists yet, choose the most appropriate framework (React Native / Swift / React web) and implement from scratch using these files as a pixel-level reference.

Open `Food Journal — Editorial × iOS.html` in a browser (with a local server if needed — it loads fonts and sibling JSX files). The canvas shows 5 screens side by side inside iOS device frames. Use the **Tweaks** panel (bottom-right) to preview accent color and serif variants.

## Fidelity

**High-fidelity.** These are pixel-intent mockups with final colors, typography, spacing, and interactions. Recreate them as closely as possible using your target environment's components. Where your environment's components deviate slightly (e.g. native iOS navigation bar height), use your best judgment to preserve intent.

---

## Design Tokens

### Color Palette

| Token       | Hex                   | Usage                              |
|-------------|----------------------|-------------------------------------|
| `bg`        | `#F5F0E6`            | App background (warm paper)         |
| `card`      | `#FFFFFF`            | Card / sheet surfaces               |
| `ink`       | `#1C1A16`            | Primary text                        |
| `mute`      | `rgba(60,50,38,0.62)`| Secondary / meta text               |
| `ter`       | `rgba(60,50,38,0.32)`| Hairline rules, disabled            |
| `sep`       | `rgba(28,26,22,0.09)`| Card dividers                       |
| `accent`    | `#A32F22`            | Editorial red — primary accent      |
| `ring`      | `#C7602F`            | Warm orange — streak/progress       |
| `cream`     | `#F6F1E7`            | Alternate card tint                 |

> The accent is user-tweakable. Provide a setting to change it. Alternative presets: Ochre `#B2711F`, Forest `#2E5D3C`, Bordeaux `#6E1F2B`, Ink `#1C1A16`.

### Typography

| Role       | Font family                       | Size  | Weight | Style   | Letter-spacing |
|------------|-----------------------------------|-------|--------|---------|----------------|
| Serif hero | Playfair Display, Georgia, serif  | 38–44px | 700  | italic  | -0.8px         |
| Serif card headline | Playfair Display        | 20–22px | 500  | italic  | -0.3px         |
| Body / lede | EB Garamond, Georgia, serif      | 15–17px | 400  | italic  | 0              |
| Drop cap   | Playfair Display                  | 46–54px | 700  | normal  | 0              |
| Kicker     | System UI / -apple-system        | 9.5px | 600   | normal  | 2.4–2.8px, UPPERCASE |
| Item name  | EB Garamond                       | 16px  | 400    | italic  | 0.1px          |
| Meta / qty | System UI                         | 10–11px | 400  | normal  | 0.6–1.6px      |

> Font loading: `https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,700&display=swap`

### Spacing

- Screen horizontal padding: **16–22 px**
- Card border-radius: **14–16 px**
- Card gap: **20 px**
- Card shadow: `0 1px 2px rgba(28,26,22,0.04), 0 6px 20px rgba(28,26,22,0.04)`
- Card divider: `0.5px solid rgba(28,26,22,0.09)`

### Tonal Tiles (ingredient swatches)

Each ingredient maps to a small colored tile (28–34 px square, border-radius 4 px). A tile has:
- A **hue**, **saturation**, **lightness** based on the food's color
- A **pattern**: `stripe` (45° repeating lines), `dot` (radial gradient grid), `cross` (grid lines), `wave` (radial arcs), or `solid`
- A subtle border: `0.5px solid rgba(0,0,0,0.12)`

Consistent mapping per ingredient (use these across all screens):
| Ingredient        | Hue | Sat | L  | Pattern |
|-------------------|-----|-----|-----|---------|
| Oats              | 40  | 30  | 72  | dot     |
| Honey             | 45  | 60  | 62  | solid   |
| Blueberries       | 235 | 35  | 44  | cross   |
| Coffee / cortado  | 25  | 30  | 34  | solid   |
| Chicken           | 30  | 28  | 58  | stripe  |
| Romaine + caesar  | 90  | 32  | 56  | wave    |
| Parmesan          | 50  | 30  | 80  | dot     |
| Croutons          | 35  | 34  | 66  | cross   |
| Water             | 200 | 10  | 88  | stripe  |
| Almonds           | 30  | 20  | 62  | dot     |
| Apple             | 8   | 55  | 54  | solid   |

Generate tiles for new ingredients algorithmically: hash the ingredient name to a hue (0–360), derive sat/l from the hue range, pick a pattern from the set.

---

## Screens

### 01 · Today (Home)

**Purpose:** The main daily view. Shows a masthead, a quiet day-summary card, and meal cards in reverse chronological order.

**Layout (vertical scroll):**
- Status bar spacer: 54 px
- Nav bar: back chevron (italic, accent color) left; search icon + avatar right. Height ~52 px.
- **Masthead block** (padding 4px 22px 14px, border-bottom 0.5px sep):
  - Kicker: `Week 16 · Day 107` — 9.5px, 3px letter-spacing, uppercase, muted
  - H1: `Today` — Playfair 42px bold italic, margin 4px 0
  - Subhead: `Friday, April 17 · 3 meals logged` — EB Garamond 15px, muted
- **Day summary card** (margin 16px, border-radius 16px, white card, shadow):
  - Kicker: `— Today` (accent kicker)
  - Serif line: `3 meals, 11 items.` — Playfair 22px, period in accent color
  - Stats row (border-top after 12px): Streak / Next meal / kcal (kcal is muted, 14px italic, not prominent)
- **Section kicker**: `— Today's Menu` in accent, with hairline rule extending right
- **Meal cards** — see Meal Card component below (3 cards: Breakfast, Lunch, Snack)
- **Footer**: `— Up next` kicker, `Dinner · salmon & rice` italic, margin-bottom 110px
- **Floating compose pill** (position absolute, bottom 28px, left/right 16px, height 54px, border-radius 27px):
  - Background: `rgba(255,253,247,0.76)` + backdrop-filter blur(20px) saturate(180%)
  - Shadow: `0 12px 32px rgba(28,26,22,0.14), 0 0 0 0.5px rgba(28,26,22,0.08)`
  - Pen icon left (opacity 0.55)
  - Placeholder: `Log a meal…` — EB Garamond 15px italic, muted
  - Right: 42px circle, accent color, italic ✎ glyph

#### Meal Card Component
```
Card (white, border-radius 16px, margin 0 16px 20px, shadow):
  ┌─ Kicker row (padding 14px 16px 8px):
  │  — BREAKFAST · 8:14  [hairline rule]
  ├─ Headline (padding 0 16px 10px):
  │  Playfair 22px, e.g. "Oats, honey, and" + italic "a second coffee."
  │  Subtitle below: "4 items" — 10.5px, 1.4px letter-spacing, muted, uppercase
  ├─ Drop-cap lede (first card only, padding 2px 16px 14px, border-bottom):
  │  Drop cap: Playfair 46px, float left, accent color
  │  Body: EB Garamond 15px, line-height 1.5
  ├─ Item rows (each: flex, gap 12, padding 10px 16px):
  │  [EISTile 30px] [Item name, italic, flex 1]
  │  Divider: 0.5px sep between rows
  └─ Footer (border-top, padding 9px 16px):
     Left: "N items" — 9.5px uppercase muted
     Right: "~NNN kcal" — EB Garamond 12px italic muted
```

---

### 02 · Compose

**Purpose:** Triggered by tapping the compose pill. Quick-capture: user writes one sentence, items appear below.

**Layout:**
- Status bar spacer
- Nav: `Cancel` (plain, muted) left · `New entry` (10px uppercase kicker, centered) · `Save` (EB Garamond 15px italic, accent) right
- **Meal type chips** (padding 8px 16px 14px, border-bottom):
  - Horizontal scrollable chips: Breakfast / Lunch (active) / Snack / Dinner
  - Active chip: accent background, white text, border-radius 999px
  - Inactive: transparent with muted border
  - Time stamp right: `12:46` italic muted
- **Paper sheet** (margin 20px 16px, white card, border-radius 14px, padding 20px):
  - Background texture: `repeating-linear-gradient(0deg, transparent 0 27px, sep 27px 27.5px)` — ruled lines
  - Kicker: `— Lunch, Friday` in accent
  - Text input area: EB Garamond 20px, line-height 1.35, min-height 108px
  - Cursor: 2px accent-colored block
  - Hint: "Write a sentence. Separate items with commas or 'and'." — 13px italic muted, margin-top 6px
- **Parsed items section** (margin 18px 16px):
  - Kicker: `— Recognized, 5 items` + `Edit` link right (12px italic accent)
  - White card, border-radius 14px:
    - Each row: [tile 28px] [name italic flex-1] [qty muted 11px] [chevron]
    - Same dividers as Today meal cards
  - Caption: "Tap any item to adjust it." — 12px italic muted, centered
- **Keyboard** (position absolute bottom 0, height 280px):
  - Suggestion strip: 3 italic word suggestions, center one highlighted on white pill
  - Standard QWERTY rows (30×38px keys, white, shadow 0 1px 0 rgba(0,0,0,0.2), border-radius 5px)
  - Space bar: white, wide
  - Save key: accent background, italic "save" text

---

### 03 · Meal detail

**Purpose:** Expanded view of a single meal — tap a card on Today.

**Layout (vertical scroll):**
- Status bar spacer
- Nav: `← Today` italic left · edit (`+`) and `···` icons right
- **Hero section** (padding 6px 22px 14px):
  - Kicker: `— Lunch · Fri, Apr 17` accent
  - H1: Playfair 40px bold — e.g. `Chicken caesar,` + line break + italic 500 `at the desk.`
  - Meta: `12:46 · 5 items · ~610 kcal` — 14px muted (kcal is here but not prominent)
- **Tonal tile strip** (margin 0 16px 22px, height 120px, border-radius 10px):
  - CSS grid with columns proportional to item importance (first col 2fr, rest 1fr)
  - Each cell is a full-height EISTile — no gaps
- **Drop-cap lede** (padding 0 22px 22px):
  - Drop cap: Playfair 54px, accent, float left, margin-right 10px
  - Body: EB Garamond 17px, line-height 1.5
- **Ingredients section** (kicker + white card):
  - Rows: [tile 30px] [name italic + note italic small muted below] [qty muted right]
  - No chevrons (it's a view, not a list to navigate)
- **Notes card** (white card, padding 14px 16px):
  - EB Garamond 15px italic, line-height 1.5
  - User's personal note about the meal
- **Meta row** (margin 0 22px 110px):
  - `Logged 12:46` · `Edited 12:51` · `Delete` (accent, right-aligned)
  - 10.5px, uppercase, muted

---

### 04 · Week / History

**Purpose:** 7-day history. Tap from nav or pull down on Today.

**Layout:**
- Status bar spacer
- Nav: `← Today` left · search right
- **Masthead** (padding 4px 22px 16px, border-bottom):
  - Kicker: `Week 16 · Apr 13 – 19`
  - H1: Playfair 38px bold italic `The week`
  - Subhead: `19 meals, 68 items · 8-day streak` — accent on streak count
- **Tonal bar chart** (padding 16px 20px 12px, border-bottom):
  - 7 columns (Mon–Sun), flex, height 56px, align-items flex-end
  - Each day: stacked colored divs representing meals (hue = food color, height = portion)
  - Current day columns have accent outline
  - Day letter (M/T/W…) below each column, accent on current
  - Empty days: single 4px muted bar
- **Section kicker**: `— The days` with extending hairline
- **Day list** (white card, border-radius 14px, margin 0 16px):
  - Each row: 38px date column (day abbrev + large date number) + description column
  - Current day: accent color, italic date number
  - Description: italic meal names joined with `·`
  - Item tiles row below (4 tiles, item count right-aligned)
  - Empty day: "Nothing logged." muted italic
  - Rows divided by 0.5px sep

---

### 05 · Empty State (First Launch)

**Purpose:** User has no entries yet. Teach the quick-capture pattern without a tutorial.

**Layout:**
- Status bar spacer
- Nav: just a dashed-border avatar placeholder (28px circle) top-right
- **Masthead**: `Week 1 · Day 1` kicker → `Today` H1 → date subhead
- **Hairline rule** (margin 0 16px)
- **Center ornament** (margin-top 48px, text-align center):
  - Rule — `§` — Rule (§ in accent, EB Garamond italic 22px)
  - H2: Playfair 32px italic bold `A blank page.`
  - Body: EB Garamond 16px muted, max-width 280px: "Start by writing what you had…"
- **Try one section** (margin 28px 20px):
  - Kicker: `— Try one`
  - White card, 3 tappable example sentences:
    - Numbered (1. 2. 3.) in accent italic Playfair 16px
    - Sentence in EB Garamond 15px italic
    - Chevron right
- **Floating compose pill** — identical to Today

---

## Interactions & Behavior

| Trigger | Action |
|---------|--------|
| Tap compose pill (Today / Empty) | Push Compose screen; meal type chip auto-selects based on time of day |
| Tap meal card body | Push Meal detail |
| Tap `Archive` / nav back | Pop to previous screen |
| Type in Compose field | Parse text live; update recognized items list below |
| Tap item in parsed list | Open item editor (qty, name correction) |
| Tap `Save` | Dismiss compose, prepend new meal card to Today |
| Tap example sentence (Empty) | Pre-fill compose field and open compose |
| Tap `Delete` on detail | Confirmation sheet → remove meal → pop to Today |

### Animations
- Compose screen enters as a bottom sheet (spring, ~0.4s)
- Parsed items list fades in as text is typed (staggered per row, 80ms delay each)
- Meal cards on Today: none — keep it still and editorial
- Nav transitions: standard iOS push/pop slide

---

## Assets & Icons

All icons are inline SVG, 1.5–1.6px stroke, round linecaps, no fill. Use `currentColor` or the `ink` token.

| Icon        | Usage                  |
|-------------|------------------------|
| ← chevron   | Back nav (10×16px)     |
| Circle + line | Search (20×20px)    |
| + (plus)    | Add / edit             |
| ··· (dots)  | More options           |
| ✎ (pencil)  | Compose pill           |

No third-party icon library required — draw these as inline SVG.

---

## State Management

```
AppState {
  entries: Entry[]          // all logged meals
  streak: number            // consecutive days logged
  currentDate: Date
}

Entry {
  id: string
  type: 'breakfast' | 'lunch' | 'snack' | 'dinner'
  timestamp: Date
  headline: string          // editorial one-liner
  note: string              // user's personal note
  items: Item[]
}

Item {
  name: string
  qty: string               // e.g. "150g", "1 bowl"
  tile: TileSpec { hue, sat, l, pattern }
}
```

Compose screen local state:
- `raw: string` — the text field contents
- `parsedItems: Item[]` — derived from raw, updated on debounce (~300ms)
- `mealType: string` — active chip

---

## Files in This Bundle

| File | Purpose |
|------|---------|
| `Food Journal — Editorial × iOS.html` | Master prototype — open in browser to see all 5 screens |
| `editorial-ios.jsx` | Today screen component + shared design tokens (`EI` object) + `EITile` |
| `editorial-ios-screens.jsx` | Compose, Detail, Week, Empty components |

Open the HTML file with a local static server (e.g. `npx serve .`) — it loads sibling JSX files via Babel standalone, so file:// won't work.

---

## Open Questions / Out of Scope

- Edit flow from detail view (editing an already-saved meal)
- Delete confirmation UI
- Siri / share sheet entry points
- Push notifications ("time to log lunch?")
- Onboarding beyond empty state
- Settings screen (accent color picker, serif selector)
- Sync / backend
