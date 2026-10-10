# Decisions

Format: date — decision — reason.

## 2026-10-04 — Phase 1 Auth

- Password hashing uses **bcrypt** (SALT_ROUNDS=12), not argon2 — brief §4 allows either and bcrypt was already a dependency (avoids a new dep per §17).
- Refresh tokens are **JWTs carrying a `jti`**; the DB stores a bcrypt hash of the full token keyed by `jti`. On refresh the old record is revoked and a new pair issued (rotation). A hash mismatch (reuse/tamper) revokes all of the user's sessions. — brief §4.2.
- Added `@nestjs/config@^4` (api) — load JWT secrets/TTLs from env instead of hard-coding. Peer warning (wants Nest 10/11, repo is Nest 12) is harmless; config v4 works on Nest 12.
- Added mobile deps: `expo-secure-store` (token storage, brief §2), `zustand` (auth/session UI state, brief §2), `@tanstack/react-query` (server data, brief §2), `react-hook-form` + `@hookform/resolvers` (forms, brief §2), `axios` (HTTP client with a 401→refresh interceptor).
- Extended `UserPreferences` with onboarding fields (`primaryGoal`, `secondaryGoal`, `experienceLevel`, nutrition targets) and added `User.onboardedAt`; added the `RefreshToken` model — brief §5 required a refresh_tokens table and staged onboarding needs a home for goal/training/nutrition data.

## 2026-10-07 — UI Redesign Slice A (Tokens, Typography & Icons)

- Added `@expo-google-fonts/inter` — implements typography direction from DESIGN.md §3.5 and §14.6, supporting tabular numerals and reliable weights across platforms.
- Added `lucide-react-native` & `react-native-svg` — icon library specified in DESIGN.md §3.6 and §14.6 (24dp default, 20dp card labels, 1.75 stroke).
- Added WCAG AA contrast tokens `accentText` (`#C4471F`) and `inkMutedText` (`#6F675F`) — resolves contrast failures on light surfaces per DESIGN.md §3.2 and §14.7.
- Added derived neutrals (`surfaceMuted`, `hairline`, `scrim`, `accentSoft`) — provides tokens for segmented tracks, dividers, sheets, and highlights per DESIGN.md §3.3.
- Enforced elevation 0 (flat cards, no shadow) and elevation 1 (floating shadow) — strictly adheres to DESIGN.md §3.4 and §13.

## 2026-10-10 — Phase 0 Corrections (Tokens, Contrast & Fixture Architecture)

- **Type scale synced to DESIGN.md §3.5:** `largeTitle: 34/40 bold (-0.4 tracking)`, `title: 28/34 bold`, `sectionTitle: 22/28 bold`, `metricHero: 48/52 bold`, `metricValue: 36/40 bold`, `unit: 17/22 medium`, `cardLabel: 17/22 semibold in accentText`, `body: 17/24 regular`, `secondary: 15/20 regular`, `eyebrow: 13/16 semibold uppercase (+0.6 tracking)`, `caption: 12/16 medium`, `primaryButton: 18/24 bold (700)`.
- **Primary button label:** set to 18sp bold (`#FFFFFF` on `#E2603B`).
- **Accent hex retained:** `#E2603B` preserved without alteration.
- **Measured WCAG Contrast Ratios:**
  - `accent` (`#E2603B`) on `white` (`#FFFFFF`): **3.52:1**
  - `white` (`#FFFFFF`) on `accent` (`#E2603B`): **3.52:1** (satisfies WCAG AA threshold of 3.0:1 for large text and bold buttons ≥18sp bold).
  - `accentText` (`#C4471F`) on `cream` (`#F6F1EA`): **4.38:1** (satisfies WCAG AA threshold of 3.0:1 for large text, headings, and card label accents).
  - `inkMutedText` (`#6F675F`) on `cream` (`#F6F1EA`): **4.94:1** (satisfies WCAG AA threshold of 4.5:1 for body and secondary text).
- **Tab Bar layout resolved (§63):** Floating pill contains 4 tabs (`Home · Train · Food · You`) plus a detached 64dp circle Coach button opening the coach sheet.
- **Fixture Gating Rule:** Hardcoded fixture numbers and subtitles moved to `src/dev/fixtures.ts` behind `EXPO_PUBLIC_USE_FIXTURES` (default false). When false, unfinished/unconnected screens render empty states or "No Data" without fake data.

## 2026-10-10 — Phase 1 Slice P1 (Forgot Password §3.3)

- **Added `@nestjs/throttler` (api):** Rate limiting auth endpoints (`POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/login`) to mitigate brute-force password guessing and spamming reset requests.
- **Reset link & dev fallback:** Password reset uses custom-scheme deep links (`liftmate://reset-password?token=...`) and an explicit manual "enter code" input field on the reset screen, enabling dev verification via server console logs without requiring HTTPS App Links in MVP.
- **Hashed token storage:** Password reset tokens are generated as 32-byte cryptographically secure random values and stored as SHA-256 hashes in `password_reset_tokens` table with single-use enforcement (`usedAt`) and 1-hour expiration.
- **Opaque response:** `POST /auth/forgot-password` returns a generic success message regardless of whether an email exists, preventing user enumeration attacks.

## 2026-10-10 — Phase 1 Slice P2 (Migration M-A & Shared Schemas)

- **PostgreSQL Enum Migration Pattern:** When altering the `Equipment` enum to replace legacy values (`cable → cable_machine`, `machine → machines`, `band → resistance_bands`), columns (`exercises.equipment` and `user_equipment.equipment`) were cast to `TEXT`, rows updated, the old enum dropped, and the new 14-item enum created before re-casting. This avoids Postgres's prohibition on using newly added enum values within the same transaction.
- **Nullable M-A Columns on Users:** All new user profile columns (`gender`, `height_cm`, `weight_kg`, `body_fat_pct`, `target_weight_kg`, `workout_duration`, `training_location`) are nullable at the database level so existing registered users survive without data loss. Required fields for new accounts are strictly validated at the application/Zod schema layer during onboarding.
- **FitnessGoal Enum:** Expanded to 5 items with `body_recomposition` per customer specification §5.
- **Equipment Enum:** Fully incorporates all 12 specification items (`barbell, dumbbell, cable_machine, smith_machine, leg_press, hack_squat, pulldown_machine, chest_press, machines, pull_up_bar, resistance_bands, bodyweight`) while retaining `kettlebell` and `other` as extras.
- **WorkoutDuration Wire Format:** Stored as `lt30`, `30_45`, `45_60`, `60_90`, `gt90` in Postgres and exposed as string literals in Zod DTOs (`WorkoutDuration`), mapped internally in Prisma service layer to avoid schema identifier grammar constraints.
- **UserPreferences Additions:** Added array columns (`preferred_equipment`, `preferred_exercises`, `avoid_exercises`, `dietary_preferences`) and boolean notification toggles (`notifications_workout_reminder`, `notifications_nutrition_reminder`, `notifications_progress_reminder`, `notifications_ai_insight`).




