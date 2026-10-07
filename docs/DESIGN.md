# LiftMate — DESIGN.md

> Companion to `LIFTMATE_AGENT_BRIEF.md`. This file defines **layout, UX patterns, components, and visual rules**. It **replaces §3 (Design language) of the brief** wherever the two differ. All other brief rules (stack, constraints, phases) still apply.
> Read this before building any screen or component. If a screen is not covered here, compose it from the components in §6 — do not invent new patterns.

---

## 0. What changed vs. the first direction

The first reference (dark cards, heavy shadows, dense home screen) felt busy. The new direction borrows the **layout and UX logic of the Apple Health app**: calm, content-first, large titles, big numbers, flat white cards on a soft background, and a few reusable patterns repeated everywhere.

| Topic | Before (brief §3) | Now |
|---|---|---|
| Overall feel | Bold, card-heavy | Calm, spacious, content-first |
| Cards | White, soft shadow | White, **flat (no shadow)** on cream |
| Dark hero card | One per screen | **Only** Home "Next workout" (see §14, decision 2) |
| Navigation | 5 tabs in a floating pill | **4 tabs in a floating pill + a detached circular Coach button** (see §14, decision 1) |
| Headers | Greeting text | **Large title** that collapses on scroll |
| Detail screens | Not defined | One shared **Metric Detail** pattern (§7.3) |
| Forms / edits | Full screens | **Sheets** with ✕ / ✓ circle buttons (§6.9) |
| Tokens | Defined in brief | **Same tokens**, plus a few derived neutrals and 2 accessibility tweaks (§3) |

**Reference is for layout and UX only.** Do not copy Apple's branding, glyphs, blue interactive colour, or health concepts we don't have (steps, sleep, walking steadiness). Do not use the reference app's name anywhere.

---

## 1. Design principles

1. **One thing per screen matters most.** Make it big. Everything else is quiet.
2. **Numbers are the interface.** Large, tabular, with a small muted unit. No dense tables.
3. **One accent colour** (coral). It means "tap me" or "this is your data". Never decorative.
4. **Flat and soft.** White cards on cream, large radii, no card shadows. Only floating elements (tab bar, circle buttons, sheets) lift off the page.
5. **Repeat patterns.** Every metric looks the same, every detail screen works the same, every edit is a sheet. Consistency beats cleverness.
6. **Gym-proof.** Large targets (≥ 48dp), high contrast, one-handed reach for primary actions.
7. **Honest data.** No fake values. Estimates are labelled. Empty states say "No Data", not a made-up zero.

---

## 2. Reference map

Five Apple Health screenshots are the reference. Save them in `/docs/design-reference/` as listed.

| File | Apple screen | What to take | LiftMate use |
|---|---|---|---|
| `01-welcome.png` | Welcome | Big rounded top sheet, icon cluster hero, bold title + muted paragraph, full-width pill button at bottom | First-run **Welcome**, permission explainers |
| `02-summary.png` | Summary | Warm gradient header, large title + avatar, section titles with text action ("Pinned / Edit"), metric cards, "Show All" row, dismissible promo card, floating pill tab bar + detached circle | **Home**, tab bar, Insight card |
| `03-metric-detail.png` | Steps detail | Circle back + centred title + circle ＋, range segmented control (D W M 6M Y), eyebrow label + big value + date range, bar chart, "About" card | **Metric Detail** (weight, volume, calories, est. 1RM…) |
| `04-all-data.png` | All Health Data | Large title, "Today" section, stacked metric cards with timestamp, single-point ring marker | **All Data** list, history lists |
| `05-edit-sheet.png` | Edit schedule sheet | Top-rounded sheet, ✕ left / ✓ right circle buttons, big title, section labels, round day toggles, summary line | **Edit sheets**, training-days selector |

All measurements below were estimated from these screenshots (1135px wide ≈ 393dp, ~2.9×). Treat them as starting values and confirm on a real Android device in Phase 0.

---

## 3. Tokens

### 3.1 Unchanged from the brief
`bg` ≈ `#F6F1EA` · `surface` `#FFFFFF` · `ink` ≈ `#1A1613` · `inkMuted` ≈ `#8A8178` · `accent` ≈ `#E2603B` · `warning` ≈ `#F59E0B` · `success` (set in tokens file).
Values are still approximate; the owner confirms them in Phase 0. **Never hard-code hex in screens.**

### 3.2 Recommended tweaks (accessibility)
Measured against WCAG contrast (approximate — verify with a contrast checker in Phase 0):

| Problem | Fix |
|---|---|
| `accent` `#E2603B` on white ≈ 3.5:1, too low for small text | Keep `accent` for fills, icons, bars, buttons. Add `accentText` ≈ `#C4471F` (≈ 4.9:1) for any text or label coloured in the accent |
| `inkMuted` `#8A8178` on white ≈ 3.8:1, too low for secondary text | Add `inkMutedText` ≈ `#6F675F` (≈ 5.5:1 on white, ≈ 4.9:1 on cream) for secondary text. Keep `inkMuted` for icons and decorative strokes |

### 3.3 Derived neutrals (new)
| Token | Value | Use |
|---|---|---|
| `surfaceMuted` | ≈ `#ECE6DD` | Segmented track, inactive chart bars, skeletons, active-tab highlight |
| `hairline` | `ink` @ 8% | Dividers, chart gridlines |
| `scrim` | `ink` @ 40% | Sheet backdrop |
| `accentSoft` | `accent` @ 14% | Selected chip backgrounds, header gradient |

### 3.4 Spacing, radius, elevation
- **Spacing scale (dp):** 4, 8, 12, 16, 20, 24, 32, 40.
- **Screen horizontal padding:** 20. **Gap between cards:** 12. **Gap between sections:** 28. **Card inner padding:** 16 (20 for hero/detail cards).
- **Radius:** `md` 20 (inputs, small cards) · `lg` 28 (cards) · `xl` 32 (sheet top corners, hero card) · `pill` 999 (buttons, tab bar, segmented control, chips) · circle for icon buttons.
- **Elevation:** `0` = flat (all cards). `1` = floating (tab bar, circle buttons, active segmented thumb): shadow `ink` @ 10%, blur ~16, y-offset 4. Use the `boxShadow` style where supported, with `elevation: 4` as fallback. Verify on a mid-range Android phone.

### 3.5 Typography
Font: **Inter** (variable). It resolves the brief's "Plus Jakarta Sans or Inter" choice: neutral, modern, close to Apple's feel, and supports tabular figures. All numbers use `fontVariant: ['tabular-nums']` — confirm it renders correctly on Android in Phase 0.

| Style | Size / line | Weight | Notes |
|---|---|---|---|
| `largeTitle` | 34 / 40 | Bold | Letter-spacing −0.4 |
| `title` | 28 / 34 | Bold | Sheets, onboarding steps |
| `sectionTitle` | 22 / 28 | Bold | "Next workout", "Insights" |
| `metricHero` | 48 / 52 | Bold | Detail-screen value |
| `metricValue` | 36 / 40 | Bold | Card value |
| `unit` | 17 / 22 | Medium | `inkMutedText`, baseline-aligned to value, 4dp gap |
| `cardLabel` | 17 / 22 | Semibold | `accentText`, next to a 20dp icon |
| `body` | 17 / 24 | Regular | `ink` |
| `secondary` | 15 / 20 | Regular | `inkMutedText` |
| `eyebrow` | 13 / 16 | Semibold | UPPERCASE, +0.6 tracking, `inkMutedText` ("AVERAGE") |
| `caption` | 12 / 16 | Medium | Tab labels, chart axes |
| `button` | 17 / 22 | Semibold | |

Use `sp` scaling. Layouts must survive 130% font scale without clipping or overlap.

### 3.6 Icons
Lucide (`lucide-react-native`), 24dp default, 20dp inside card labels, stroke 1.75. Record in `docs/DECISIONS.md`. Icons come from this set only — no Apple glyphs.

---

## 4. Layout system

- **Background:** `bg` everywhere. Cards are `surface`.
- **Edge-to-edge:** draw behind the status and navigation bars. Apply safe-area insets to headers and the floating tab bar. Status-bar icons dark in light mode.
- **Header gradient (Home only):** a vertical gradient from `accentSoft` at the top to `bg` at ~280dp, scrolling away with the content. (Apple's warm gradient, in our colour.)
- **Large title header** (Home, Train, Food, You): title left, optional trailing action (avatar on Home, circle button elsewhere). On scroll past ~40dp it collapses to a centred 17sp semibold title on a `bg` bar.
- **Detail header** (Metric Detail, All Data, any pushed screen): leading circle back button, centred title, optional trailing circle button.
- **Scroll bottom padding:** `tabBarHeight + 24 + bottomInset`, so the last card is never hidden behind the floating bar.
- **Sections:** `sectionTitle` on the left, optional text action on the right (`accentText`, `body` size, e.g. "Edit"). 12dp below the title, 28dp above it.

---

## 5. Navigation

**Floating tab bar** (bottom, above the system gesture area):
- Pill, height 64, radius pill, left/right margin 20, bottom margin 12 + inset. Background `surface` @ 94% with elevation `1`. **No blur in MVP** (see §14, decision 4).
- **4 tabs:** `Home · Train · Food · You`. Icon 24 + `caption` label. Active tab: `surfaceMuted` pill highlight behind icon+label, colour `accentText`. Inactive: `ink` icon, `inkMutedText` label.
- **Detached Coach button:** 64dp circle to the right of the bar, `surface`, elevation `1`, sparkle icon in `accent`. Opens Coach as a full-height sheet (§7.6).
- The tab bar **is hidden** during an Active Workout and inside sheets.

Tap feedback: scale 0.97 over 120ms; no ripple on the bar itself.

---

## 6. Components

Build these once in `/apps/mobile/components`, all consuming tokens only. Names are canonical.

### 6.1 `CircleButton`
44dp visual, 48dp hit area, `surface`, elevation `1`, icon 22 `ink`. Variants: `default`, `confirm` (filled `accent`, white check), `close` (✕). Used for back, add (＋), close, confirm.

### 6.2 `LargeTitleHeader` / `DetailHeader`
As described in §4. Both support a trailing slot. The large title collapses with a smooth cross-fade (200ms).

### 6.3 `SectionHeader`
`sectionTitle` + optional text action. Action has a 48dp hit area.

### 6.4 `MetricCard` (the core pattern)
Flat `surface`, radius 28, padding 16–20, min height ~130.

```
┌──────────────────────────────────────────┐
│ ◉ Calories                  Today   ›    │  ← cardLabel (icon + label, accentText)  |  secondary timestamp + chevron
│                                          │
│ 1,840 kcal                  ▂ ▄ ▃ █      │  ← metricValue + unit  |  mini bars (right)
└──────────────────────────────────────────┘
```
- Top row: icon + `cardLabel` left; timestamp/date (`secondary`) + chevron right.
- Bottom row: `metricValue` + `unit` left (baseline aligned); sparkline right.
- Whole card is pressable → opens Metric Detail. Press feedback: scale 0.98.
- **Sparkline:** 3–7 bars, width 8–10, gap 6, radius pill. The latest bar is `accent` and tallest/most relevant; earlier bars `surfaceMuted`. A single data point renders as a **hollow ring** (`accent` stroke) instead of a bar.
- **No data:** the value area shows `No Data` in `metricValue` size, `inkMutedText`. No sparkline.
- Optional second line under the value (e.g. "of 2,400 target") in `secondary`.

### 6.5 `ListRowCard`
Single-row card (height 56–64): icon, label (`body`), trailing chevron. Used for "Show All Data", settings groups (Apple-style inset grouped list: rows inside one card separated by `hairline`).

### 6.6 `InsightCard` (dismissible promo / AI insight)
Radius 28, padding 20. Left: 56dp illustration or icon tile (`accentSoft` background). Right: `body` semibold title, `secondary` description, and a text link in `accentText`. Top-right: 28dp ✕ circle (`surfaceMuted`) to dismiss. Used for AI Insights and suggestions on Home ("Get more from LiftMate"). Dismissal persists per insight id.

### 6.7 `SegmentedControl` (range picker)
Track `surfaceMuted`, radius pill, height 40 (48 hit area). Thumb `surface`, elevation `1`, slides with a spring (200ms). Options: `D · W · M · 6M · Y` (hide `D` where daily view is meaningless). Selection persists per metric.

### 6.8 `PrimaryButton` / `SecondaryButton`
Full-width pill, height 56. Primary: `accent` fill, white `button` text (use white-on-accent for ≥ 18sp bold only; otherwise confirm contrast). Secondary: `surfaceMuted` fill, `ink` text. Disabled: 40% opacity. Loading: spinner replaces label, width stays fixed.

### 6.9 `Sheet`
Modal bottom sheet over `scrim`. Top radius 32, `surface`, drag-to-dismiss, no grabber.
- **Edit sheet:** `CircleButton close` top-left, `CircleButton confirm` top-right, `title` below, sections with `sectionTitle`-sized labels at 20, controls inside `bg`-tinted rounded containers (radius 28). Changes apply only on ✓; ✕ discards (confirm if there are unsaved edits).
- **Picker sheet:** list rows; selecting dismisses.
- Used for: add food, edit training days, rest-timer options, exercise picker, set options, Coach.

### 6.10 `DaySelector`
Seven 44dp circles (hit area 48) inside a rounded container: M T W T F S S. On = `accent` fill, white letter. Off = `surface`, `ink` letter. Used for **training days** in onboarding and program editing. Multi-select.

### 6.11 `BarChart` / `LineChart`
See §8.

### 6.12 `Chip`
Pill, height 36, `surfaceMuted` (selected: `accentSoft` + `accentText`). Used for Coach suggested questions, filters.

### 6.13 `EmptyState`
Centred icon (48, `inkMuted`), `sectionTitle`, `secondary` line, optional `SecondaryButton`. Used for empty lists, not for individual metrics (those use `No Data`).

---

## 7. Screen blueprints

Wireframes show structure, not final spacing.

### 7.1 Welcome / permission screens (ref `01-welcome`)
- Top: a coloured band (`accentSoft`) with the status bar; below it a white sheet with a large top radius (32) fills the rest.
- Hero: a loose cluster of 10–14 small LiftMate icons (dumbbell, flame, fork-knife, scale, chart, sparkle…) around the app mark. Static in MVP.
- Text (left aligned): `title` bold, then 1–2 muted `body` paragraphs.
- Bottom: full-width `PrimaryButton` ("Continue"), 24dp above the bottom inset.

### 7.2 Home (ref `02-summary`)
```
[gradient]
MONDAY, 5 OCT                         ← eyebrow
Today                       (AV)      ← largeTitle + avatar circle 44

Next workout                          ← sectionTitle
┌──────────────────────────────┐
│ ▓ DARK HERO CARD ▓            │      ← only dark card in the app
│ Pull · 44 min · 5 exercises   │
│ [ ▶ Start workout ]           │      ← PrimaryButton (accent)
└──────────────────────────────┘

Summary                      Edit*    ← *post-MVP, hide
[MetricCard Calories]
[MetricCard Workouts this week]
[MetricCard Body weight]
[ListRowCard Show All Data ›]

Insights
[InsightCard ✕]
```
- Cards: Calories (vs target), Workouts (this week), Body weight (latest), Training volume (this week). Fixed order in MVP. Pinned/customisable cards are post-MVP; build `MetricCard` so it can support it later.
- Hero card: `surface`-contrasting dark (`ink`), radius 32, padding 20. Program name as `eyebrow`, workout name `title` in white, meta in `secondary` on dark, then the primary button. If no program is active, show a "Create your plan" hero instead.

### 7.3 Metric Detail (ref `03-metric-detail`)
```
(‹)          Body Weight          (＋)    ← DetailHeader
[ D | W | M | 6M | Y ]                    ← SegmentedControl
AVERAGE                                   ← eyebrow
72.4 kg                                   ← metricHero + unit
Oct 5–11, 2026                            ← secondary
[ chart ]                                 ← §8
About Body Weight                         ← sectionTitle
┌ card: 3–5 lines of plain explanation ┐
```
- Eyebrow states what the number is: `AVERAGE`, `TOTAL`, `LATEST`, `BEST`. Value and date range update with the selected range and with chart scrubbing.
- ＋ opens the add-entry sheet for that metric (log weight, add food, etc.).
- The **About card** is also where estimates are explained (e.g. estimated 1RM: formula, "estimate only"). Any estimated value on any screen carries an `Est.` suffix or chip.
- Used for: body weight, training volume, per-exercise strength (best weight, reps, est. 1RM), calories, protein/carbs/fat, consistency.

### 7.4 All Data (ref `04-all-data`)
Large title "All Data", then section(s) ("Today", "Earlier") with stacked `MetricCard`s, each showing last-updated time. Reached from the Home "Show All Data" row. Also reused for workout history: the same card list with workout summaries.

### 7.5 Train
- Large title "Train". Hero (dark) card duplicates Home's only if a workout is due today; otherwise a light `MetricCard`-style "Rest day" card.
- Sections: **My Program** (one `ListRowCard` per training day), **Planner** (`InsightCard`-style entry for AI Planner), **History** (`ListRowCard`s → workout detail).
- Exercise library opens as a search sheet.

### 7.6 Active Workout (no Apple reference — needs its own pass)
This is the one screen where function beats the reference. Rules until a dedicated design pass:
- **Tab bar hidden.** Full-screen, focus mode.
- Sticky bottom bar: rest-timer chip (counts from timestamps) + `Finish`.
- Set rows: `# · previous · kg · reps · RIR · ✓`, each control ≥ 48dp, numeric keypad, large type.
- Completing a set: light haptic, row fades to `surfaceMuted`, rest timer starts.
- Never lose input: every change persists locally immediately (brief §4, rule 12).
- Exercise picker, set options, and notes are sheets.
> Gap: this screen should get its own `WORKOUT_UX.md` before Phase 2 starts.

### 7.7 Food
- Large title "Food". A week strip of 7 date circles (same style as `DaySelector`, single-select) under the title.
- Summary `MetricCard` for calories with protein/carbs/fat as three mini-bars below it.
- Meals (Breakfast, Lunch, Dinner, Snacks) as `ListRowCard` groups with a trailing ＋. Tap an entry → edit sheet. Food search and the AI photo flow open as sheets.

### 7.8 Coach (detached button)
- Opens a full-height `Sheet` (top radius 32) with ✕ on the left.
- Messages: user bubbles `ink` on `surface`-inverse; assistant text on `bg`, no bubble, `body`. Suggested questions as `Chip`s above the input. Input is a pill with a trailing send circle (`accent`).
- Insight/estimate labels from the AI follow the "fact vs inference" rule (brief §6).

### 7.9 You
- Large title "You". Header card: avatar, name, goal.
- Inset grouped lists (`ListRowCard` groups): Profile, Goals & targets, Training days, Equipment, Units, Notifications, Privacy & data, About, Sign out.
- Editing opens an **edit sheet** (§6.9).

### 7.10 Onboarding steps
- Step 0: Welcome (§7.1).
- Steps: top row has `CircleButton` back and a slim progress bar (`surfaceMuted` track, `accent` fill). `title` + `secondary` description. Content (options as large selectable cards, `DaySelector` for training days). Sticky `PrimaryButton` "Continue" above the inset.
- Selectable card: `surface`, radius 28, 2dp `hairline` border; selected: 2dp `accent` border + `accentSoft` fill.

---

## 8. Charts

- **Bar chart** (volume, calories, workouts, protein): bars use `accent`, top radius 6, width ≈ 60% of slot. **Future / empty slots** show nothing (not zero-height bars). Inactive/non-selected bars in a scrub may dim to `surfaceMuted`.
- **Line chart** (body weight, est. 1RM): 2.5dp `accent` line, 6dp dots, a ring marker for a single point; no fill.
- **Grid:** dashed vertical dividers per slot (`hairline`) in the W view; solid horizontal hairlines at 3–4 y-values. **Y-axis labels on the right**, `caption`, `inkMutedText`. X labels at the bottom, `caption`, `inkMutedText`.
- Chart height 220–260. Respect locale for numbers and dates.
- **Scrubbing (Phase 5):** long-press and drag shows a value callout and updates the header value and date. Light haptic tick per bar.
- Minimum data rules from the brief apply: don't draw trend lines or conclusions from 1–2 points; show the ring marker and `Not enough data yet` caption.
- Animate in: bars grow from the baseline, 300ms, 20ms stagger. Disabled when reduce-motion is on.

---

## 9. States

| State | Treatment |
|---|---|
| No data (metric) | `No Data` in value position, `inkMutedText`; no chart |
| Empty list | `EmptyState` with one action |
| Loading | Skeletons: `surfaceMuted` blocks, radius matching the real element, 1.2s shimmer; never a blank screen |
| Error | Inline card: short message + `SecondaryButton` "Try again" |
| Offline | Slim pill under the header: "Offline — changes will sync". Logging never blocks |
| AI unavailable | Card in place of AI content: "Coach is unavailable right now" + retry |
| Low confidence (food photo) | Warning row in `warning` colour above the result, always editable |
| Estimate | `Est.` suffix/chip; explained in the About card |

---

## 10. Motion & haptics

- **Durations:** press 120ms · transitions 200–250ms ease-out · sheets spring (damping ≈ 20) · chart grow 300ms.
- **Haptics** (`expo-haptics`): light impact on set complete and segmented change; success notification on rest-timer end and workout finish; warning on destructive confirm.
- Respect **reduce motion**: disable chart grow, parallax, and the header gradient shift; keep simple fades.

---

## 11. Android specifics

The reference is an iOS app; adapt, don't imitate.
- Edge-to-edge with transparent navigation bar; support gesture navigation and **predictive back** (circle back button and system back behave the same).
- No iOS-style blur dependency; solid translucent surfaces are the default.
- List rows use a subtle ripple (`ink` @ 8%); cards and buttons use the scale feedback from §5.
- Test at 130% font size and on small (360dp) and large (412dp+) widths.
- Test the floating bar against 3-button navigation, not just gesture navigation.

---

## 12. Accessibility

- Contrast: apply the §3.2 tweaks; verify every text/background pair with a checker.
- Targets ≥ 48dp (visual size may be smaller).
- Every icon-only button has an `accessibilityLabel`. Charts expose a text summary ("Average 72.4 kilograms, October 5 to 11").
- Never use colour alone: status (success/warning) also uses an icon or text.
- Support TalkBack focus order that follows the visual order.

---

## 13. Don't

- Don't add a second brand colour or per-metric rainbow colours.
- Don't put shadows on cards.
- Don't use more than one dark hero card, and never on detail or list screens.
- Don't hard-code colours, sizes, or radii in screens.
- Don't show Apple's icons, name, or health concepts (steps, sleep, walking steadiness, HealthKit).
- Don't draw charts for fewer than 2 data points; use the ring marker.
- Don't show fake or default numbers (no invented recovery score).
- Don't build new patterns when §6 has one.

---

## 14. Decisions and open items

Each has a recommended default; the owner can overturn any of them.

1. **Coach as a detached circle button (replaces the 5th tab).** Mirrors Apple's detached search button and keeps the bar clean. Fallback: 5 tabs in the pill (`Home · Train · Coach · Food · You`).
2. **Dark hero card kept for Home "Next workout" only.** It keeps LiftMate's identity and gives the one primary action. Fallback: make it a white `MetricCard`-style hero with an accent button.
3. **Single accent, no per-domain colours.** Apple colours each metric differently; we don't. If screens feel monotone, add at most two data-viz tokens (nutrition, body) and record it.
4. **No blur on the floating bar for MVP.** Blur is costly and inconsistent on Android. Revisit after performance testing.
5. **Pinned / customisable Home is post-MVP.** Home shows a fixed set of cards; `MetricCard` is built to support pinning later.
6. **Font: Inter; icons: Lucide.** Record in `docs/DECISIONS.md`.
7. **Accessibility token tweaks (§3.2)** need owner approval since they alter the brief's tokens.
8. **Active Workout screen** needs a dedicated design pass (§7.6).
9. **Final token values** (cream, coral, ink) are still sampled by eye; confirm in Phase 0.

---

## 15. Build mapping

| Brief phase | Design deliverables |
|---|---|
| 0 | Tokens file (§3), `CircleButton`, `LargeTitleHeader`, `DetailHeader`, `SectionHeader`, `MetricCard`, `ListRowCard`, `SegmentedControl`, `PrimaryButton`, `Sheet`, `FloatingTabBar`, `Chip`, skeletons; a Storybook-style demo screen |
| 1 | Welcome (§7.1), Onboarding (§7.10), `DaySelector`, You (§7.9), edit sheets |
| 2 | Active Workout (§7.6, after its own design pass), Train history |
| 3 | Train (§7.5), Home hero card |
| 4 | Food (§7.7) |
| 5 | Metric Detail (§7.3), `BarChart`, `LineChart`, scrubbing, All Data (§7.4) |
| 6 | Coach sheet (§7.8), `InsightCard` states, AI error and low-confidence states |
| 7 | Reduce-motion, TalkBack and font-scale pass, 3-button-nav test |

---

## 16. Agent checklist (per screen or component)

- [ ] Uses only tokens (colour, spacing, radius, type, elevation)
- [ ] Reuses a §6 component; no one-off cards or buttons
- [ ] Targets ≥ 48dp; contrast verified; labels on icon buttons
- [ ] Works at 130% font scale, 360dp and 412dp widths
- [ ] Has loading, empty / `No Data`, error, and offline states
- [ ] Numbers are tabular with muted units; estimates are labelled
- [ ] Android: edge-to-edge insets, system back, scroll padding above the floating bar
- [ ] Strings wrapped for i18n
