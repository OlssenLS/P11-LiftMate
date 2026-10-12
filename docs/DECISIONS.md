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

## 2026-10-11 — Phase 1 Slice P3 (Onboarding Wizard §4.1–§9 & Exercise Seed)

- **Starter Exercises Seed Across All 12 Equipment:** Seeded 43 canonical starter exercises covering all 12 equipment categories (`barbell`, `dumbbell`, `cable_machine`, `smith_machine`, `leg_press`, `hack_squat`, `pulldown_machine`, `chest_press`, `machines`, `pull_up_bar`, `resistance_bands`, `bodyweight`) with complete metadata (primary/secondary muscles, movement patterns, difficulty, instructions, external IDs) to enable exercise searching and preference picking.
- **7-Step Onboarding Wizard (§4.1, §5, §5.1, §6, §7, §8, §9):** Split onboarding into 7 steps to prevent information overload and density:
  - Step 1: "About you" (display name, date of birth, gender, timezone)
  - Step 2: "Your body" (height in cm, weight in kg, optional body fat %, optional target weight, weight unit)
  - Step 3: "Goals" (primary goal with 5 options, optional secondary goal)
  - Step 4: "Training profile" (experience with 3 options, frequency 2–6 days/week, duration with 5 options, location with 4 options)
  - Step 5: "Equipment" (all 12 items via interactive EquipmentCards)
  - Step 6: "Training preferences" (preferred equipment chips, searchable preferred exercises tag list, searchable exercises to avoid tag list)
  - Step 7: "Nutrition profile" (automatic vs manual calculation, Mifflin-St Jeor formula, macro targets, dietary preference chips)
- **Mifflin-St Jeor Nutrition Calculation:**
  - Standard formulas: Male constant `+5`, Female constant `-161`.
  - Non-binary / Prefer not to say: uses midpoint constant `-78` (`(5 + (-161)) / 2`), labeled an estimate in the UI.
  - Activity multipliers based on weekly training frequency (<=2 days: 1.375, 3–4 days: 1.55, 5–6 days: 1.725).
  - Goal calorie adjustment: `lose_fat` -500 kcal, `build_muscle` +300 kcal, `gain_strength` +200 kcal, `body_recomposition` -100 kcal, `general_fitness` 0 kcal.
  - Macro split: Protein 2.0 g/kg, Fat 0.9 g/kg, remainder carbohydrates (minimum 50 g).
- **Height Unit in cm:** Height is recorded and displayed in `cm` for MVP regardless of weight unit selection to ensure consistency in metabolic calculations.
- **Dietary Preference Chips:** Supported options: `None`, `Vegetarian`, `Vegan`, `Halal`, `Pescatarian`, `Gluten-free`, `Dairy-free`.
- **Profile Null Handling ("Add"):** The "You" screen displays body metrics rows and renders an "Add" label for any unconfigured null fields.

## 2026-10-11 — Phase 1 Slice P4 (Profile & Settings §65, §66)

- **Users Endpoints & Live Profile Persistence (§65, §66):**
  - Implemented `UsersController` (`/users`) with authenticated routes protected by `JwtAccessGuard`:
    - `GET /users/me` (retrieves current `PublicUser`)
    - `PATCH /users/me` (updates user demographic fields and metrics)
    - `GET /users/me/preferences` & `PATCH /users/me/preferences` (retrieves and updates `UserPreferences`)
    - `GET /users/me/equipment` & `PUT /users/me/equipment` (retrieves and atomically syncs equipment array)
    - `POST /users/me/change-password` (verifies current password against bcrypt hash, validates $\ge 8$ chars, and sets new hash)
- **Profile Screen ("You") Interactive Sheets:**
  - Connected `you.tsx` to live TanStack Query hooks (`useProfile`, `useUserPreferences`, `useUserEquipment`).
  - Interactive edit sheets with server-side mutations for Profile Details, Goals & Targets, Training Schedule, Equipment, Training Preferences (with `ExercisePicker`), Notification Settings (4 toggles), Units (`kg` / `lb`), and Change Password.
  - Body Metrics displays live user height, weight, body fat %, target weight, gender, duration, location with an "Add" button/label on null values.

## 2026-10-11 — Phase 2 Slice W0 (Migration M-B & Workout Schemas)

- **Migration M-B (`20261011140000_migration_m_b`):**
  - Added enum `WorkoutStatus` (`in_progress`, `completed`, `cancelled`).
  - Added `alternative_exercises` (`TEXT[]` default `ARRAY[]::TEXT[]`) on `exercises` table.
  - Renamed `workouts.note` to `workouts.notes` preserving all existing note rows.
  - Added `workouts.status` (default `'completed'` for existing rows) and nullable `workouts.program_id`.
  - Added index on `workouts(user_id, status)`.
  - Added `workout_sets.rir_unknown` (`BOOLEAN` default `false`).
  - Added `workout_sets.rpe` (`DECIMAL(3,1)` nullable, backend storage only, never exposed in active logging UI).
  - Added `workout_sets.rest_time` (`INTEGER` nullable seconds duration selected for that set's timer).
  - Added `workout_sets.notes` (`TEXT` nullable set notes).
- **RIR Representation (WORKOUT_UX.md §5.1):**
  - RIR is stored as an integer 0–5 (with 5 representing `5+`) and a boolean `rir_unknown` flag for explicit "Unknown" selections.
  - Both "Unknown" and unrecorded RIR values are excluded from average RIR calculations.
- **Set Rest Duration (WORKOUT_UX.md §6.1):**
  - `rest_time` on `workout_sets` records the duration in seconds selected for that set's rest timer.

## 2026-10-11 — Phase 2 Slice W1 (Backend Workout API & Metrics)

- **Workout History & Status Filtering:**
  - `GET /workouts` supports `status` query filter (`in_progress`, `completed`, `cancelled`) alongside `limit` and `offset` pagination, allowing the client to query completed history without fixture mocks.
- **Exercise History Query (`GET /workouts/exercise-history`):**
  - Added dedicated endpoint to fetch recent completed workouts containing a specific exercise (up to 20 sessions, default 5) to back the Exercise History bottom sheet.
- **Deterministic Workout Summary Performance Deltas (WORKOUT_UX.md §9.2):**
  - Extended `WorkoutsService.summary` to compute per-exercise progress comparisons:
    - Identifies heaviest completed working set in current session vs heaviest completed working set in previous session.
    - Generates strict factual strings: `+X kg compared with previous session` (or negative delta), `+X rep(s) at Y kg`, `No change`, or `First time logged`.
    - Computes `volumePercentageChangeVsPrevious` against previous completed workout.
- **Mobile Workout Query Hooks:**
  - Added `useWorkoutHistory`, `useWorkoutDetail`, `usePreviousSession`, `useExerciseHistory`, and `useDeleteWorkout` in `apps/mobile/src/features/workout/use-workout-queries.ts`.

## 2026-10-11 — Phase 2 Slice W2 (Active Workout 6-Column UI & Live Logging)

- **6-Column Compact Row Layout (WORKOUT_UX.md §4.1):**
  - Set (44dp), Prev (48dp), Weight (48dp), Reps (48dp), RIR (46dp), Done (44dp).
  - Total row width is 278dp, fitting a 360dp phone (304dp inner width) with room to spare without clipping or horizontal scrolling.
  - Prev chip auto-fills previous session values into weight and rep inputs on tap.
- **Stacked Fallback Layout (WORKOUT_UX.md §4.2):**
  - Activates when `width < 360` or `fontScale >= 1.15`, stacking Set/Done header on row 1 and Weight/Reps/RIR inputs on row 2.
- **Surface StatsCard (WORKOUT_UX.md §3.2):**
  - Replaced former dark Live Volume card with a single surface card (`colors.surface`, radius 28, hairline border, 0 elevation) displaying Total Volume (kg), Completed Working Sets / Total Working Sets, and live Duration.
- **Header & Session Navigation (WORKOUT_UX.md §3.1, §3.3, §3.4):**
  - Minimize button displays non-modal "Your progress is saved" sheet before navigating back.
  - Title tap opens rename sheet; notes pill opens notes sheet.
  - Three-dot menu provides "Discard workout" with destructive confirmation sheet.
- **Rest Timer Controls (WORKOUT_UX.md §6.1, §6.2):**
  - Idle state renders a rest timer chip showing target duration (e.g. `2:00 Rest`), opening a duration picker sheet with presets (60s, 90s, 120s, 180s) and custom mm:ss inputs.
  - Active state renders a persistent bottom bar with animated MM:SS countdown, -15s and +15s delta adjustments, and a Skip button.
  - Completing a set auto-starts the timer for the set's configured rest duration.
- **RIR Picker Sheet (WORKOUT_UX.md §5.1):**
  - Tapping RIR chip opens a bottom sheet with 0, 1, 2, 3, 4, 5+ pills and an "Unknown" pill.
  - RPE is never exposed in logging UI.
- **Set Options & Undo Deletion (WORKOUT_UX.md §4.3):**
  - Set options sheet supports toggling Working / Warmup set type, adding set notes, and deleting the set.
  - Set deletion displays an animated 4-second Undo snackbar restoring the set and its values.
- **Exercise Actions & Exercise History Sheet (WORKOUT_UX.md §7.1, §7.2):**
  - Exercise action menu allows viewing history, replacing the exercise, or removing the exercise.
  - History sheet pulls past sessions via `useExerciseHistory` displaying completed sets and Epley Est. 1RM.
- **Finish Workout Incomplete Sets Confirmation (WORKOUT_UX.md §8.1):**
  - Tapping "Finish workout" with unchecked sets prompts confirmation to discard incomplete sets.
- **React Compiler & External Store Purity:**
  - Clock ticks for elapsed duration utilize `useSyncExternalStore` external store subscription, avoiding impure calls or cascading `setState` in `useEffect`.

## 2026-10-11 — Phase 2 Slice W3 (Summary Screen, History List & History Detail)

- **Workout Summary Screen (WORKOUT_UX.md §9.2):**
  - Surface hero card (radius 28, hairline border, light background, no dark card) with total volume in `metricHero`, volume percentage change vs previous session (or factual "First time logging this workout"), and micro-stats for Duration, Exercises, and Working Sets.
  - Performance section renders factual per-exercise deltas from `useWorkoutSummary` without praise or causal claims.
  - Editable workout name and notes via modal bottom sheets, with local override state avoiding impure `useEffect` cascades.
  - Sticky "Save workout" button commits pending name/note edits via `PATCH /workouts/:id`, removes local SQLite active workout state via `discardWorkout()`, invalidates query cache, and returns to `/(app)`.
- **Workout History List in Train Screen (WORKOUT_UX.md §10.1):**
  - Connected `apps/mobile/src/app/(app)/train.tsx` to live TanStack query `useWorkoutHistory('completed')`.
  - Grouped workouts by date headings with `sectionTitle` / uppercase eyebrow date strings.
  - Renders each session in a `ListRowCard` displaying workout name, `X min · Y exercises`, and clock icon.
  - Tapping a session navigates to `/workout/[id]`.
  - Empty state renders `EmptyState` with "No workouts yet" and primary action "Start a workout".
- **Workout History Detail Screen (WORKOUT_UX.md §10.2):**
  - Implemented dynamic route `apps/mobile/src/app/workout/[id].tsx` with `presentation: 'card'`.
  - `DetailHeader` with back button, workout name, and More menu sheet triggering "Delete workout" with confirmation dialog.
  - Subtitle displays formatted date and duration.
  - Surface stats card displays Total Volume (computed via shared `computeVolume`), Exercises count, and Working sets.
  - Read-only exercise cards display set rows (`weight × reps · RIR`), warmup badges (`W`), and set notes.

## 2026-10-11 — Fix Workout Sets Position Unique Constraint Violation (P2002)

- **Removed Unconditional Unique Constraints on (parent_id, position):**
  - `workout_sets` and `workout_exercises` use soft-delete (`deletedAt`). Unconditional unique constraints on `(workout_exercise_id, position)` and `(workout_id, position)` caused P2002 errors when sets/exercises were deleted or reordered during workout synchronization because soft-deleted rows still held their position indexes.
  - Applied migration `20261011150000_drop_position_unique_constraints` dropping `workout_sets_workout_exercise_id_position_key` and `workout_exercises_workout_id_position_key`, replacing them with non-unique indexes for ordering performance.
  - Enhanced `WorkoutsService.create` to atomically soft-delete sets or exercises that were removed on the client during bulk sync.

## 2026-10-11 — Phase 3 Slice PR0 (Migration M-C & Shared Program Schemas)

- **Migration M-C (`20261011160000_migration_m_c`):**
  - Added enum `ProgramStatus` (`active`, `completed`, `archived`).
  - Added `programs` table (`id`, `user_id`, `program_name`, `goal`, `frequency`, `duration`, `description`, `status`, `created_at`, `updated_at`, `deleted_at`) per Spec §62.
  - Added `program_exercises` table (`id`, `program_id`, `day`, `day_name`, `exercise_id`, `sets`, `rep_min`, `rep_max`, `target_rir`, `rest_seconds`, `order`, `created_at`, `updated_at`, `deleted_at`) per Spec §62.
  - Added foreign key from `workouts.program_id` to `programs.id` with `ON DELETE SET NULL`.
  - Added relations between `User.programs`, `Exercise.programExercises`, and `Program.workouts`.
- **Shared Schemas (`packages/shared/src/program.ts`):**
  - Implemented `createProgramSchema`, `updateProgramSchema`, `programSchema`, `programExerciseInputSchema`, and `programExerciseSchema`.

## 2026-10-11 — Phase 3 Slice PR1 (Template Library, Rule Selection Engine & Backend API)

- **Starter Template Programs (`apps/api/src/programs/templates/starter-templates.ts`):**
  - Created 6 evidence-based starter templates based on progressive overload principles:
    1. Full Body 3-Day Foundation (`full-body-3day`)
    2. Upper / Lower 4-Day Split (`upper-lower-4day`)
    3. Push / Pull / Legs 6-Day Split (`ppl-6day`)
    4. Dumbbell Only 3-Day (`dumbbell-3day`)
    5. Bodyweight Only 3-Day (`bodyweight-3day`)
    6. Strength Focus 3-Day (`strength-fullbody-3day`)
  - All exercises reference verified seed catalog exercises (`externalId`).
- **Rule Selection Engine (`apps/api/src/programs/rule-engine.ts`):**
  - Evaluates user equipment, weekly frequency, fitness goal, and avoid-list.
  - Automatically substitutes exercises matching user avoid-list via `fallbackExternalId` or `alternativeExercises` compatible with user equipment.
  - Penalizes unresolvable avoid-list collisions or equipment mismatches.
- **Programs API Endpoints (`apps/api/src/programs/`):**
  - `GET /programs`: lists user's programs.
  - `GET /programs/current`: retrieves active program with exercises and days. Auto-assigns recommended program if user is onboarded but lacks an active program.
  - `GET /programs/templates`: exposes starter template library.
  - `POST /programs`: creates a custom program.
  - `GET /programs/:id`: retrieves program details with exercises.
  - `POST /programs/:id/activate`: sets selected program as active and archives others.
  - `POST /programs/:id/start-day/:day`: instantiates an active `Workout` with pre-filled planned exercises, sets, target reps, target RIR, rest seconds, and queries previous session weights for progressive overload baseline.
- **Onboarding Integration:**
  - `OnboardingService.complete` triggers `ProgramsService.assignRecommendedProgram` upon onboarding completion so a personalized program is immediately ready.

## 2026-10-11 — Phase 3 Slice PR2 (Mobile Program Integration)

- **Active Workout Store (`apps/mobile/src/features/workout/active-workout-store.ts`):**
  - Added optional `programId` to `ActiveWorkout` state and idempotent `enqueueWorkout` payload.
  - Implemented `startFromWorkout(workout: Workout)`: hydrates active workout state from pre-filled backend program workout with all exercises, sets, target reps, target RIR, and rest seconds. Persists snapshot to SQLite and enqueues sync op.
- **Program Queries (`apps/mobile/src/features/program/use-program-queries.ts`):**
  - `useCurrentProgram`: queries `GET /programs/current` for the user's active program.
  - `useProgramTemplates`: queries `GET /programs/templates` for starter templates.
  - `useStartProgramDay`: mutation calling `POST /programs/:id/start-day/:day` and invalidating cache.
- **Train Screen (`apps/mobile/src/app/(app)/train.tsx`):**
  - "Today's Session" hero card: Connected to live active program data. Renders `IN PROGRESS` card if session active, next scheduled program day (`PROGRAM · DAY X`, day name, exercise count, duration estimate) with "Start Workout" action, or "No workout scheduled" with "Create Workout" fallback.
  - "My Program" section: Renders live program day list with exercises summary and tap-to-start action; renders `EmptyState` when no program is assigned.
- **Home Screen (`apps/mobile/src/app/(app)/index.tsx`):**
  - "Next workout" hero card: Connected to live active program data and live in-progress state, launching pre-filled workout or falling back to "Create Workout".

## 2026-10-11 — Phase 4 Slice N0 (Migration M-D, Shared Nutrition Schemas & Seeds)

- **Migration M-D (`20261011170000_migration_m_d`):**
  - Added enum `MealType` (`breakfast`, `lunch`, `dinner`, `snack`).
  - Added enum `FoodSource` (`verified`, `custom`, `tkpi`, `open_food_facts`).
  - Added `foods` table:
    - Primary key `id` (UUID), `name`, `serving_size`, `serving_unit`, `serving_weight_g`, `calories`, `protein`, `carbs`, `fat`, `source`, `barcode`, `external_id`, `created_at`, `updated_at`, `deleted_at`.
    - Indexes on `name`, `source`, `deleted_at`, unique constraints on `barcode` and `external_id`.
  - Added `food_logs` table:
    - Primary key `id` (UUID, client-assignable for offline idempotent sync), `user_id`, `food_id` (nullable with `ON DELETE SET NULL`), `food_name`, `serving_size`, `quantity`, `meal_type`, `logged_at`, `calories`, `protein`, `carbs`, `fat`, `source`, `notes`, `created_at`, `updated_at`, `deleted_at`.
    - Foreign key to `users(id)` with `ON DELETE CASCADE`.
    - Indexes on `user_id`, `(user_id, logged_at)`, `(user_id, meal_type)`, `food_id`, `deleted_at`.
- **Shared Nutrition Types & Zod Schemas (`@liftmate/shared`):**
  - Exported `MealType` and `FoodSource` enum schemas.
  - Exported `FoodSchema`, `CreateFoodSchema`, `FoodLogSchema`, `CreateFoodLogSchema`, `UpdateFoodLogSchema`.
  - Exported `DailyNutritionSummarySchema`, `MealGroupSchema`, `MacroNutrientsSchema`.
- **Starter Food Seeds (`apps/api/prisma/seed.ts`):**
  - Seeded 28 staples covering Indonesian staples (TKPI: Nasi Putih, Nasi Merah, Tempe Goreng, Tempe Kukus, Tahu Putih, Tahu Goreng, Ikan Kembung, Ubi Jalar, Bayam) and core fitness staples (Dada Ayam, Paha Ayam, Telur Rebus, Putih Telur, Daging Sapi Cincang, Salmon, Oatmeal, Roti Gandum, Pisang, Apel, Kentang, Brokoli, Susu Full Cream, Susu Low Fat, Greek Yogurt, Whey Protein, Selai Kacang, Minyak Zaitun, Alpukat).
- **Automated Verification:**
  - Added `apps/api/src/common/migration-m-d.spec.ts` testing PostgreSQL enum constraints, model CRUD, food logging, updates, and soft deletes.

## 2026-10-11 — Phase 4 Slice N1 (Backend Nutrition API & Daily Aggregations)

- **Foods API (`apps/api/src/nutrition/foods.*`):**
  - `GET /foods/search?q=&limit=`: Searches foods by name with case-insensitive contains, filtering out soft-deleted records, prioritized by verified/tkpi sources.
  - `POST /foods`: Creates custom food entries validated by `createFoodSchema` (`ZodValidationPipe`).
  - `GET /foods/:id`: Fetches a single food item by UUID.
- **Food Logs API (`apps/api/src/nutrition/food-logs.*`):**
  - `GET /food-logs?date=YYYY-MM-DD`:
    - Retrieves daily logs within UTC boundaries `00:00:00` to `23:59:59.999`.
    - Queries user's personalized targets from `UserPreferences` (`targetCalories`, `targetProtein`, `targetCarbs`, `targetFat`) falling back to baseline defaults (2000 kcal / 150g P / 200g C / 65g F).
    - Computes totals across all logged meals rounded to 1 decimal place.
    - Computes remaining macros: `Math.max(0, target - total)`.
    - Computes progress percentages: `(total / target) * 100`.
    - Groups logs into meal categories (`breakfast`, `lunch`, `dinner`, `snack`) with per-meal macro subtotals.
    - Conforms to `DailyNutritionSummary` shared schema.
  - `POST /food-logs`:
    - Accepts `CreateFoodLogInput` with optional client UUID (`id`).
    - Uses Prisma `upsert` on `id` ensuring offline sync idempotency without creating duplicate entries upon retry.
  - `PATCH /food-logs/:id`:
    - Partially updates existing food log fields with ownership verification (`userId`).
  - `DELETE /food-logs/:id`:
    - Soft-deletes food log (`deletedAt = new Date()`) with ownership verification (`userId`).
- **Automated Verification:**
  - Added 19 unit tests across `foods.service.spec.ts`, `foods.controller.spec.ts`, `food-logs.service.spec.ts`, and `food-logs.controller.spec.ts` (120/120 tests passing in backend suite).

## 2026-10-11 — Phase 4 Slice N2 (Mobile Nutrition Integration & Offline Logging)

- **Mobile Nutrition Feature (`apps/mobile/src/features/nutrition/`):**
  - Implemented `use-nutrition-queries.ts`:
    - `useDailyNutritionSummary(date)`: Queries `GET /food-logs?date=${date}` for daily totals, targets, remaining macros, progress percentages, and grouped meals.
    - `useFoodSearch(query, limit)`: Live search against `GET /foods/search?q=${query}&limit=${limit}` with a 5-minute stale cache.
    - `useCreateFoodLog()`: Offline-first mutation generating client UUID via `newId()` (`expo-crypto`), enqueueing to SQLite `sync_queue` if offline or on network error, and updating TanStack Query cache.
    - `useUpdateFoodLog()`: Calls `PATCH /food-logs/${id}` and invalidates nutrition queries.
    - `useDeleteFoodLog()`: Calls `DELETE /food-logs/${id}` and invalidates nutrition queries.
    - `useCreateFood()`: Calls `POST /foods` to store custom food catalog entries.
- **Food Screen (`apps/mobile/src/app/(app)/food.tsx`):**
  - **Dynamic Week Strip:** Replaced static days with 7-day rolling window centered on today with interactive date selection, active styling, and haptic feedback (`selectionTick()`).
  - **Live Daily Summary:** Replaced mock fixtures with live `useDailyNutritionSummary(selectedDate)`. Displays calories consumed vs budget, remaining calories, and dynamic progress tracks for protein, carbs, and fat.
  - **Live Meal Categories:** Groups logged foods into Breakfast, Lunch, Dinner, and Snacks sections with meal macro subtotals. Tapping any logged item opens an options sheet with logged macros and "Delete Entry" action.
  - **Interactive Add Food Sheet:** Supports category selection chips (`Breakfast`, `Lunch`, `Dinner`, `Snacks`), dual-mode interface (`Catalog Search` with real-time API query & portion multiplier chips `0.5x`, `1x`, `1.5x`, `2x`, `3x`, and `Custom Food` entry for ad-hoc meals).
- **Home Screen Integration (`apps/mobile/src/app/(app)/index.tsx`):**
  - Connected the Home Screen "Calories" MetricCard to `useDailyNutritionSummary(todayDateStr)`, showing today's real logged calories and remaining budget.

## 2026-10-11 — Phase 5 Slice PRG0 (Migration M-E & Shared Progress Schemas)

- **Migration M-E (`20261011190000_migration_m_e`):**
  - Added `body_weight_logs` table:
    - Primary key `id` (UUID), `user_id` (UUID FK to `users`), `weight_kg` (`DECIMAL(5,2)`), `logged_at` (TIMESTAMP), `notes` (TEXT), `created_at`, `updated_at`, `deleted_at`.
    - Indexes on `user_id`, `(user_id, logged_at)`, `deleted_at`.
  - Added `exercise_personal_records` table:
    - Primary key `id` (UUID), `user_id` (UUID FK), `exercise_id` (UUID FK), `max_weight` (`DECIMAL(7,2)`), `max_reps` (INT), `max_estimated_1rm` (`DECIMAL(7,2)`), `achieved_at` (TIMESTAMP), `workout_set_id` (UUID nullable FK with `ON DELETE SET NULL`), `created_at`, `updated_at`.
    - Unique constraint on `(user_id, exercise_id)` for idempotent PR tracking and quick indexing.
- **Deterministic 1RM Calculation (LIFTMATE_AGENT_BRIEF §8):**
  - Implemented `calculateEstimated1RM(weightKg, reps)` using the Epley formula: `weightKg * (1 + reps / 30)` for working sets, rounded to 1 decimal place, returning raw weight when reps = 1.
- **Shared Schemas (`packages/shared/src/progress.ts`):**
  - Exported `BodyWeightLogSchema`, `CreateBodyWeightLogSchema`, `WeightProgressSummarySchema`.
  - Exported `ExercisePersonalRecordSchema`, `ExerciseStrengthProgressSchema`.
  - Exported `VolumeProgressSummarySchema`, `ConsistencyProgressSummarySchema`, and `ProgressOverviewSchema`.
- **Automated Verification:**
  - Added `apps/api/src/common/migration-m-e.spec.ts` verifying Epley 1RM formula, `body_weight_logs` CRUD with soft-deletes, and `exercise_personal_records` upsert operations.

## 2026-10-11 — Phase 5 Slice PRG1 (Backend Progress API & Metrics Calculation Service)

- **Progress API (`apps/api/src/progress/`):**
  - `GET /progress/weight`:
    - Retrieves body weight logs ordered chronologically.
    - Computes `currentWeightKg`, `startWeightKg`, `targetWeightKg`, `changeThisMonthKg` (comparison vs 30-day baseline), history list, and 10-point sparkline.
    - Supports low-data empty state without fake numbers when user has not logged weight yet.
  - `POST /progress/weight`:
    - Validated by `createBodyWeightLogSchema` via `ZodValidationPipe`.
    - Upserts weight log and updates `user.weightKg` atomically within a Prisma transaction.
  - `GET /progress/strength/:exerciseId`:
    - Calculates per-exercise strength progression from completed workouts and working sets.
    - Computes all-time best weight, best reps, and max estimated 1RM using Epley formula.
    - Returns session progression history.
  - `GET /progress/volume?range=week|month`:
    - Sums `weight * reps` across all completed sets for the requested period.
    - Groups volume by primary muscle group (`primaryMuscle`) with percentage distribution.
    - Generates timeline volume data points and sparkline series.
  - `GET /progress/consistency`:
    - Compares completed workouts against planned weekly frequency from active program or user preferences.
    - Computes adherence percentage, streak of consecutive compliant weeks, and 4-week history breakdown.
  - `GET /progress/summary`:
    - Aggregates weight, volume, consistency, and top exercise PRs in a single request for high-performance Home screen hydration.
- **Automated Verification:**
  - Added 14 unit tests across `progress.service.spec.ts` and `progress.controller.spec.ts` (137/137 tests passing in backend suite).

## 2026-10-11 — Phase 5 Slice PRG2 (Mobile Progress Integration & Metric Detail Screen)

- **Mobile Progress Feature (`apps/mobile/src/features/progress/`):**
  - Implemented `use-progress-queries.ts`:
    - `useProgressSummary()`: Queries `GET /progress/summary` for combined weight, volume, consistency, and PR metrics.
    - `useWeightProgress()`: Queries `GET /progress/weight` for weight history, 30-day delta, and sparkline points.
    - `useLogWeight()`: Offline-capable mutation with client-generated UUID via `newId()`, fallback enqueueing to SQLite `sync_queue`, invalidating `['progress']` and `['user', 'profile']`.
    - `useVolumeProgress(range)`: Queries `GET /progress/volume?range=${range}` for total volume and muscle breakdown.
    - `useConsistencyProgress()`: Queries `GET /progress/consistency` for adherence % and 4-week compliance history.
    - `useStrengthProgress(exerciseId)`: Queries `GET /progress/strength/${exerciseId}` for per-exercise progression.
- **Metric Detail Screen (`apps/mobile/src/app/metric/[id].tsx`):**
  - Replaced static `METRIC_CONFIGS` fixtures with live API queries:
    - **Weight:** Displays live `currentWeightKg`, `unit`, `changeThisMonthKg`, `LineChart` of actual history entries, and an interactive "Log Body Weight" sheet that saves directly to backend via `useLogWeight()`.
    - **Calories:** Displays live daily calories consumed vs budget, macro ratio breakdown bar chart, and direct shortcut to log meals.
    - **Volume:** Displays live total volume, Week/Month range picker, `BarChart` timeline, and dynamic muscle group distribution breakdown with percentage progress tracks.
    - **Workouts:** Displays live completed vs planned sessions, consistency %, streak weeks, and 4-week compliance history `BarChart`.
    - **Empty State:** Clean empty state when no historical data exists for a metric yet.
- **Home Screen Integration (`apps/mobile/src/app/(app)/index.tsx`):**
  - Connected the 3 remaining Home Screen MetricCards to `useProgressSummary()`:
    - `Workouts`: Shows live completed vs planned sessions, adherence %, streak, and 4-week compliance sparkline.
    - `Body Weight`: Shows current weight, 30-day delta, and 10-point weight sparkline.
    - `Training Volume`: Shows weekly volume in kg, leading muscle group, and weekly volume sparkline.

## 2026-10-11 — Phase 6 Slice AI0 (Migration M-F & Shared AI Schemas)

- **Migration M-F (`20261011210000_migration_m_f`):**
  - Added enums:
    - `AiMessageRole` (`user`, `assistant`, `system`).
    - `AiInsightCategory` (`training_volume`, `progressive_overload`, `recovery_fatigue`, `nutrition_protein`, `consistency_streak`).
    - `AiInsightConfidence` (`high`, `medium`, `low`, `insufficient`).
  - Added `ai_conversations` table (`id`, `user_id`, `title`, `created_at`, `updated_at`, `deleted_at`).
  - Added `ai_messages` table (`id`, `conversation_id`, `role`, `content`, `metadata`, `created_at`) with cascade delete from conversations.
  - Added `ai_insights` table (`id`, `user_id`, `category`, `title`, `observation`, `evidence`, `possible_factors`, `recommendation`, `confidence`, `data_window_start`, `data_window_end`, `created_at`, `updated_at`, `deleted_at`).
- **Shared Schemas (`packages/shared/src/ai.ts`):**
  - Exported Zod schemas and TypeScript types: `AiMessageSchema`, `SendAiMessageSchema`, `AiConversationSchema`, `CreateAiConversationSchema`, `AiConversationDetailSchema`, `AiInsightSchema`, `SuggestedQuestionsResponseSchema`, `AiProviderGenerateOptions`, `AiProviderGenerateResult`.
- **Automated Verification:**
  - Added `apps/api/src/common/migration-m-f.spec.ts` verifying enum integrity, conversation/message cascade deletes, and insight soft-deletes.

## 2026-10-11 — Phase 6 Slice AI1 (AI Provider, Coach Backend & Mobile Chat)

- **AI Provider Abstraction (`apps/api/src/ai/provider/`):**
  - Defined `AiProvider` interface with `generate({ system, messages, maxTokens?, temperature? })` per brief §8.
  - Implemented `GeminiAiProvider`: calls Gemini REST API via native `fetch` when `GEMINI_API_KEY` or `AI_API_KEY` is present in configuration; provides a zero-network deterministic fallback responder for offline development and CI environments.
  - Fallback strictly enforces §8 rules: mandatory safety notice on pain/injury, citations of real user context numbers, and disclaimers when data is insufficient.
- **Server-Side AI Rate Limiting (`AiRateLimiterService`):**
  - Enforces a daily request limit (50 requests/day per user) server-side per brief §4 rule 9. Returns `429 Too Many Requests` with reset information.
- **Coach Context Retrieval Pipeline (`CoachContextService`):**
  - Retrieves structured factual metrics only (never raw DB tables to LLM): user demographics, primary/secondary goals, equipment, daily nutrition targets, today's logged macros, active program, last 3 workouts (volume, sets, RIR), and top PRs.
  - Injects strict system prompt forbidding hallucinations, medical diagnoses, or fabrications.
- **Coach API Endpoints (`apps/api/src/ai/coach/`):**
  - `GET /ai/coach/conversations`: Lists user conversations.
  - `GET /ai/coach/active`: Fetches or creates the active user coaching conversation.
  - `POST /ai/coach/conversations`: Creates custom conversation with optional initial message.
  - `GET /ai/coach/conversations/:id`: Fetches conversation detail and messages.
  - `POST /ai/coach/conversations/:id/messages`: Rate-limited message handler with conversational memory and context injection.
  - `GET /ai/coach/suggested-questions`: Dynamic contextual questions based on user's recent training and food logs.
- **Mobile AI Coach Chat Screen & Sheet (`apps/mobile/src/app/(app)/coach.tsx`):**
  - Replaced temporary "Coming Soon" placeholder with live chat experience:
    - Safety & medical disclaimer banner per §43.
    - Dynamic suggested questions chips with one-tap sending.
    - Real-time conversation thread with formatted timestamps, user vs coach bubble styling, and typing indicator.
    - Text input with send button and rate-limit error banner.
  - Connected Home screen InsightCard with "Ask AI Coach" shortcut.

## 2026-10-12 — Phase 6 Slice AI2 (AI Workout Planner & Periodization Engine)

- **AI Workout Planner Architecture (`apps/api/src/ai/planner/`):**
  - Implemented `PlannerService` and `PlannerController` with endpoints:
    - `POST /ai/planner/generate`: Generates personalized training splits conforming to user's goal, frequency (2–6 days), duration, equipment, and focus notes.
    - `POST /ai/planner/confirm`: Persists generated routine to `programs` and `program_exercises` and activates it as the user's primary schedule.
- **Strict Exercise Validation Filter (Brief §4 rule 12):**
  - Candidate exercises are pre-filtered to user's available equipment and avoid-list.
  - When LLM outputs exercises, every `exerciseId` is validated against candidate database exercises. Hallucinated IDs or duplicate movements are replaced with matching valid exercises for that primary muscle group.
  - When AI is offline or without API key, the deterministic periodization engine designs balanced splits (Full Body, Upper/Lower, PPL) with target rep ranges, sets, RIR, and rest periods matching the user's goal.
- **Mobile AI Planner UI (`apps/mobile/src/features/program/ai-planner-modal.tsx`):**
  - Interactive multi-step configuration & preview modal:
    - Configuration: Goal chips, 2–6 days/week frequency selector, session duration picker, and optional special focus text input.
    - Plan Preview: Hero overview with frequency/duration badges, day navigation tabs, and exercise cards showing sets, reps, target RIR, and rest seconds.
    - Activation: "Save & Activate Program" button immediately updates the user's active program, Train screen, and Home "Next Workout" hero card.
  - Connected Train tab Planner section `InsightCard` with "Generate Routine with AI" action.

## 2026-10-12 — Phase 6 Slice AI3 (AI Analytics & Evidence-Based Insights)

- **AI Analytics Engine (`apps/api/src/ai/analytics/`):**
  - Implemented `AnalyticsService` and `AnalyticsController` with endpoints:
    - `GET /ai/analytics/overview` (and `/ai/analytics/insights`): Computes and returns data sufficiency status, deterministic 4-week metrics, and categorized insights.
    - `POST /ai/analytics/generate`: Triggers fresh analytics metrics calculation and insight synthesis.
- **Data Sufficiency Gate (Spec §54, Brief §4 rule 19):**
  - Verifies whether the lifter has logged at least 3 completed workouts and 3 days of nutrition logs.
  - If insufficient: Returns `isSufficient: false` with prompt: "Complete at least several workout and nutrition entries before generating a meaningful trend analysis." System strictly prevents premature conclusions from 1–2 data points.
- **Deterministic Metrics Pipeline (Spec §51):**
  - Calculates 4-week window metrics directly from database rows:
    - Workouts completed and adherence % against target weekly frequency.
    - Working-sets volume (`weight * reps`), average weekly volume, and period-over-period volume delta %.
    - Average daily calories and protein with user target adherence %.
    - Average working sets RIR.
    - Stagnant lift detection: Identifies exercises with identical load across 3+ consecutive sessions (matching Bench Press specification in §52).
- **Structured Output Format (Spec §52, §53, §55):**
  - Every insight follows the strict specification schema: `category`, `title`, `observation`, `evidence`, `possibleFactors` (array), `recommendation`, `action` (`ask_coach` | `review_plan` | `none`), and `confidence` (`high` | `medium` | `low`).
  - Strict compliance with AI Data Rules (§68): LLM only receives structured numbers; no medical diagnoses; causation claims replaced with "may be one factor".
  - Deterministic fallback engine generates rule-based insights if AI keys are absent or rate-limited.
- **Mobile AI Analytics UI (`apps/mobile/src/app/analytics.tsx`):**
  - Full dedicated analytics screen accessible from Home dashboard:
    - Low-data state: Clean empty card matching §54 with progress counters towards required workouts and nutrition logs.
    - High-data state: 4-card metric overview grid, plateau notice alert, category filter tabs (All, Training, Nutrition, Recovery), and detailed insight cards with observation quote borders, evidence boxes, factors list, and recommendation callouts.
    - Contextual action triggers: "Ask AI Coach" pre-fills coach chat with contextual prompt (§56); "Review Workout Plan" navigates to Train tab (§57).
  - Connected Home dashboard Section "Insights" (Spec §14) to live `useAnalyticsOverview()`, presenting live potential insights with "View Analytics" shortcut.
## 2026-10-12 — Phase 6 Slice AI4 (Multimodal AI Food Recognition & Multi-Item Confirmation)

- **Dependency: `expo-image-picker` (`~57.0.20`):**
  - Standard Expo SDK 57 native module enabling cross-platform camera capture and photo library image selection with base64 serialization for AI food scanning (Brief §4 rule 4).
- **Multimodal AI Provider Extension (`GeminiAiProvider`):**
  - Extended `AiProviderGenerateOptions` to accept `images?: Array<{ mimeType: string; base64: string }>` formatted as `inlineData` parts in Gemini API payloads.
  - Implemented multimodal fallback returning structured JSON for common Indonesian meals (Nasi Putih + Dada Ayam + Telur) when offline or in simulated environments.
- **AI Food Recognition Engine (`apps/api/src/ai/food/`):**
  - Implemented `FoodRecognitionService` and `FoodRecognitionController` with endpoints:
    - `POST /ai/food/recognize`: Rate-limited vision endpoint identifying foods and portion grams from photo base64 data.
    - `POST /ai/food/confirm`: Transactionally persists confirmed meal items to `food_logs` with `source: 'ai_recognition'`.
  - **Strict Data Correctness (Brief §4 rule 11):** Nutrition numbers (calories, protein, carbs, fat) are strictly computed from verified database food records (`Food`), never from free-text LLM hallucinations.
  - **Portion Weight Calculation:** Multiplies database serving macros by `portionGrams / servingWeightG`.
  - **Mandatory Estimate Label & Warning (Brief §4 rule 13, Spec §32):**
    - Scans are strictly labeled `isEstimated: true` with visible `ESTIMATED NUTRITION` badge.
    - Ambiguous or low-confidence scans automatically display the mandatory warning: *"Food identification may be inaccurate. Please verify the detected food and portion."*
- **Mobile AI Food Recognition UI (`apps/mobile/src/features/nutrition/ai-food-recognition-modal.tsx`):**
  - Interactive multi-step modal:
    - Camera/Gallery Picker with meal type chips and demo scan fallback.
    - Visual scanning loading state with animated progress and top-down guidance.
    - Interactive Confirmation Sheet:
      - Photo summary and estimate warning badge.
      - Per-item cards with confidence rating, portion stepper (-25g / +25g), delete action, and live macro updates.
      - Total nutrition summary card.
      - "Confirm & Add to Diary" action calling `useConfirmFoodRecognition()`.
  - Connected Food tab header with 1-tap Camera circle button and Add Food Sheet with prominent AI Scan card.

## 2026-10-12 — Slice N (Navigation & Insights Shell Migration)

- **Approved by User:** Explicitly authorized via `"nav approved"` (resolving Open Decision 1, Brief §10).
- **Floating Tab Bar Reconfiguration (`apps/mobile/src/components/ui/tab-bar.tsx`):**
  - Updated floating pill tab bar to 4 primary tabs: `Home · Train · Food · Insights` (`TrendingUp` icon for Insights; `tabs.insights`).
  - Detached 64dp Coach circle button remains positioned next to the pill, triggering the full-height Coach sheet / route.
- **Profile / You Access Migration (`apps/mobile/src/app/(app)/index.tsx`, `you.tsx`):**
  - Profile (You) removed from the floating pill tab bar.
  - Profile is now exclusively accessed via the interactive top-header avatar CircleButton on the Home screen (`/(app)/index.tsx`), navigating to `/(app)/you`.
  - Added header back button (`CircleButton icon="back"`) on `You` screen using `LargeTitleHeader` `leading` slot to enable effortless return navigation to Home.
  - In `(app)/_layout.tsx`, `<Tabs.Screen name="you" options={{ href: null, title: 'You' }} />` preserves deep-linkability while omitting it from the tab bar.
- **Dedicated Insights Tab Screen (`apps/mobile/src/app/(app)/insights.tsx`):**
  - Built full `InsightsScreen` featuring `LargeTitleHeader`, refresh mutation action, and bottom tab scroll padding (`useTabScrollPadding()`).
  - Implements Spec §54 Data Sufficiency Gate:
    - Low-data state: *Not enough data yet* card with workout & nutrition days progress checklist and 1-tap shortcuts ("Log Workout", "Log Food").
    - High-data state: 4-card metric overview grid, plateau notice alert, category filter tabs, structured insight cards, and contextual actions ("Ask AI Coach", "Review Workout Plan").
- **Legacy Route Redirection (`apps/mobile/src/app/analytics.tsx`):**
  - Route `/analytics` redirects via `<Redirect href="/(app)/insights" />` to preserve deep link and route backward compatibility.
- **Automated Contract Tests (`apps/api/src/common/navigation-spec.spec.ts`):**
  - Added 6 automated tests validating the 4 tab keys, layout configuration, avatar link, back navigation, and data sufficiency state.

