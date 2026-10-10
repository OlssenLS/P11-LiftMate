# LiftMate Spec Traceability Matrix

> **Source of Truth:** Customer Specification (`docs/spec/08.pdf`)  
> **Visual Reference:** `DESIGN.md`  
> **Traceability Audit Date:** 2026-10-07  
> **Visual Verification Status:** **Visual result NOT verified** (no emulator/device connected via ADB in build environment).

---

## 1. Specification Requirements Traceability Matrix

| Spec § | Feature / Requirement | Status | File Paths | Notes |
| :--- | :--- | :---: | :--- | :--- |
| **§3.1** | Register (Name, Email, Password, Confirm password, Optional Google Sign-In) | **Partial** | `apps/mobile/src/app/(auth)/register.tsx`<br>`apps/api/src/auth/auth.controller.ts`<br>`packages/shared/src/user.ts` | Email/password/name registration works end-to-end. Confirm password is on mobile UI; Google Sign-In is not implemented. |
| **§3.2** | Login (Email, Password, Forgot Password link, Create Account link) | **Built** | `apps/mobile/src/app/(auth)/login.tsx`<br>`apps/api/src/auth/auth.controller.ts` | Login endpoint and form built. Forgot password link navigates to `/(auth)/forgot-password`. |
| **§3.3 (a)** | Forgot Password (email input, reset link/token mechanism) | **Built** | `apps/mobile/src/app/(auth)/forgot-password.tsx`<br>`apps/mobile/src/app/(auth)/reset-password.tsx`<br>`apps/api/src/auth/auth.controller.ts`<br>`apps/api/src/auth/auth.service.ts`<br>`apps/api/prisma/schema.prisma` | Request screen, reset screen with deep-link (`liftmate://reset-password?token=`) and manual code fallback, rate-limited opaque `POST /auth/forgot-password` and `POST /auth/reset-password`, hashed single-use `password_reset_tokens` DB table, ConsoleEmailProvider in dev. |
| **§4.1 / §5 / §5.1 (b)** | Onboarding fields: Name, Age/DOB, Gender, Height, Weight, Optional Body Fat %, Primary Goal (5 options), Optional Secondary Goal | **Partial** | `apps/mobile/src/app/(onboarding)/index.tsx`<br>`packages/shared/src/auth.ts`<br>`apps/api/src/onboarding/onboarding.service.ts`<br>`apps/api/prisma/schema.prisma` | DB schema and shared schemas updated via Migration M-A (`gender`, `height_cm`, `weight_kg`, `body_fat_pct`, `target_weight_kg`, `workout_duration`, `training_location`, `body_recomposition`). UI wizard update to 7 steps is in Slice P3. |
| **§6 (c)** | Training Profile: Experience (3), Frequency (2–6 days), Duration (5 options: <30, 30–45, 45–60, 60–90, 90+ min), Location (4: Commercial gym, Home gym, Home, Outdoor) | **Partial** | `apps/mobile/src/app/(onboarding)/index.tsx`<br>`packages/shared/src/auth.ts`<br>`packages/shared/src/enums.ts`<br>`apps/api/prisma/schema.prisma` | DB schema and shared schemas updated via Migration M-A with `WorkoutDuration` and `TrainingLocation` enums. UI pickers to be added in Slice P3. |
| **§7 (d)** | Equipment Profile: All 12 items (Barbell, Dumbbell, Cable machine, Smith machine, Leg press, Hack squat, Pulldown machine, Chest press, Machines, Pull-up bar, Resistance bands, Bodyweight) | **Built** (DB/Shared) / **Partial** (UI) | `packages/shared/src/enums.ts`<br>`apps/mobile/src/app/(onboarding)/index.tsx`<br>`apps/api/prisma/schema.prisma` | All 12 items + extras active in PostgreSQL `Equipment` enum and shared DTOs. Legacy database rows migrated (`cable → cable_machine`, `machine → machines`, `band → resistance_bands`). |
| **§8 (e)** | Training Preferences: Preferred equipment, Preferred exercises, Exercises to avoid | **Partial** | `apps/api/prisma/schema.prisma`<br>`packages/shared/src/user.ts`<br>`apps/mobile/src/app/(onboarding)/index.tsx` | DB and shared schemas have `preferred_equipment`, `preferred_exercises`, `avoid_exercises`, `dietary_preferences`. Onboarding UI step to be added in Slice P3. |
| **§9 (f)** | Nutrition Profile: Daily calorie & protein targets, dietary preferences, "Calculate automatically" vs "Set manually" | **Partial** | `apps/mobile/src/app/(onboarding)/index.tsx`<br>`packages/shared/src/auth.ts`<br>`apps/api/prisma/schema.prisma` | Calories/protein/carbs/fat and dietary preference arrays now in DB and shared schemas. UI step for Auto vs Manual and dietary preference chips to be added in Slice P3. |
| **§10–14 (g)** | Home Contents: Header ("Name + Goal · Experience"), Nutrition card (Calories, progress bar %, P/C/F, "View Nutrition"), Next workout card ("Start Workout" / "No workout scheduled" + "Create Workout"), Progress card (Current weight, Target weight, change this month, consistency, recent strength), AI insight actions ("View Analytics", "Ask AI Coach") | **Partial** | `apps/mobile/src/app/(app)/index.tsx` | Visual shell exists. Deficiencies: Header shows "Today" instead of user greeting + "Goal · Experience"; Nutrition card is generic MetricCard missing macros and "View Nutrition" CTA; Workout card is hardcoded without empty-state fallback ("No workout scheduled"); Progress card is split into metric cards without target weight or consistency; AI Insight has dismiss/breakdown instead of "View Analytics" & "Ask AI Coach". |
| **§15–22 (h)** | Workout Tracker: Planned & custom workouts, set fields (Weight, Reps, RIR), RIR picker (0–5+, Unknown), Add/Delete/Edit/Complete set, Notes, Rest timer (30/60/90/120/180/custom), Previous-session display, Summary (delta vs previous, total sets, volume, Save Workout button), History list & History detail | **Partial** | `apps/mobile/src/app/workout/active.tsx`<br>`apps/mobile/src/app/workout/summary.tsx`<br>`apps/mobile/src/app/(app)/train.tsx`<br>`packages/shared/src/workout.ts`<br>`apps/api/src/workouts/workouts.controller.ts` | Local persistence & timestamp timer exist. Deficiencies: Active workout set rows lack `Previous` column and `RIR` picker (only 48dp set number, kg, reps, done); notes missing; rest timer bar hardcoded to 120s; Active Workout has dark hero card violating DESIGN.md single-dark-card rule; Summary lacks per-exercise delta vs previous session and total sets; History list in Train screen is hardcoded fixture linking to `/metric/[id]` rather than workout history detail screen. |
| **§23 (i)** | Exercise DB Fields: id, name, primary_muscle, secondary_muscles, equipment, movement_pattern, difficulty, instructions, alternative_exercises | **Partial** | `apps/api/prisma/schema.prisma`<br>`packages/shared/src/workout.ts`<br>`apps/api/src/exercises/exercises.service.ts` | All fields present except `alternative_exercises` (missing in Prisma and shared DTOs). |
| **§24–28 (j)** | Nutrition: Daily overview, Food Journal (meals), Add food methods (Manual, AI, Food DB search), Manual entry fields (Name, Serving size, Quantity, Calories, Protein, Carbs, Fat, Meal type, Meal time), Food DB structure & search | **Partial** (UI) / **Missing** (API & DB) | `apps/mobile/src/app/(app)/food.tsx`<br>`apps/api/prisma/schema.prisma` | Mobile UI has week strip and meal categories with 100% hardcoded fixture data. Add food sheet has dummy placeholders. No backend Food or FoodLog models in Prisma, no API endpoints exist. |
| **§29–32** | AI Food Recognition: Camera/upload, multi-food detection, portion estimation, nutrition calculation, confidence warning | **Deferred** | Phase 6 | Explicitly reserved for Phase 6 per prompt instructions ("DO NOT Build AI Food Recognition"). |
| **§33–38 (l)** | AI Workout Planner & Programs: Programs model (`program_id, user_id, program_name, goal, frequency, duration, status`), Program Exercises (`id, program_id, day, exercise_id, sets, rep_min, rep_max, target_rir, rest_seconds, order`), pre-filled workout generation | **Missing** | `apps/api/prisma/schema.prisma`<br>`apps/mobile/src/app/(app)/train.tsx`<br>`apps/mobile/src/features/workout/active-workout-store.ts` | Neither `Program` nor `ProgramExercise` exists in Prisma or shared schemas. Train screen has static buttons that navigate to empty active workout. `active-workout-store.ts` cannot initialize pre-filled workouts. |
| **§39–43** | AI Coach: Chat interface, suggested questions, context retrieval architecture, safety & medical disclaimer | **Deferred** | `apps/mobile/src/app/(app)/coach.tsx` | Phase 6. Screen has UI shell; backend/LLM is Phase 6. |
| **§44–49 (k)** | Progress Tracking: Body weight log & history, Per-exercise strength view (best weight, best reps, volume, history, chart), Estimated 1RM (labelled estimate), Volume breakdowns (exercise, muscle group, workout, week, month), Consistency (% planned vs completed) | **Partial** (UI) / **Missing** (Backend) | `apps/mobile/src/app/metric/[id].tsx`<br>`apps/api/prisma/schema.prisma` | Metric detail screen exists but runs entirely on hardcoded fixture arrays (`METRIC_CONFIGS`). No `BodyProgress` model in Prisma. No endpoint for body weight logs, per-exercise strength history, estimated 1RM, volume aggregation, or consistency percentage. |
| **§50–57** | AI Analytics: Metrics calculation, Structured Analytics Data, Category insights, Data sufficiency check ("Not enough data yet") | **Deferred** / **Partial** | `apps/mobile/src/components/ui/insight-card.tsx` | Phase 6. Mobile insight card primitive is built. Analytics generation is Phase 6. Empty state ("Not enough data yet") needed for Insights tab. |
| **§58–61** | Architecture (AI context, Planner, Analytics pipelines) | **Architectural Reference** | N/A | Reference specifications for Phase 6. |
| **§62 (m)** | Database Structure (15 tables) | **Partial** | `apps/api/prisma/schema.prisma` | Full inventory detailed in Section 2 below. 7 out of 15 tables exist; 8 are missing. |
| **§63** | Navigation Structure (Home, Workout, Nutrition, Planner, Insights, floating/entry Coach) | **Built / Conforming** | `apps/mobile/src/app/(app)/_layout.tsx`<br>`apps/mobile/src/components/ui/tab-bar.tsx` | Tab bar is 4 tabs (`Home · Train · Food · You`) in the floating pill plus a detached 64dp Coach circle button opening the Coach sheet, as Step 0 confirmed. (Future route adjustments gated on user approval). |
| **§64** | AI Coach Entry Points (Home, Analytics, Workout, Nutrition, Planner) | **Partial** | Various screens | Header/card shortcuts exist partially; full integration in Phase 6. |
| **§65 (g)** | Profile & Settings: Displays Name, Age, Height, Weight, Goal, Experience, Training Frequency; Actions: Edit Profile, Edit Goals, Edit Equipment, Edit Nutrition Target, Edit Preferences, Notification Settings, Account Settings, Logout | **Partial** | `apps/mobile/src/app/(app)/you.tsx` | Name/email displayed. Missing profile header fields: Age, Height, Weight, Training Frequency. Missing action sheets: Edit Preferences, Notification Settings (toggle storage), Account Settings (change password). |
| **§66** | Notification System: Workout reminder, Nutrition reminder, Progress reminder, AI Insight | **Missing** | `apps/mobile/src/app/(app)/you.tsx` | Optional for MVP. UI toggle storage required in F4; push delivery later. |
| **§67** | Error Handling: AI fail, food recognition fail, offline banner, insufficient data | **Built** | `apps/mobile/src/components/ui/offline-banner.tsx`<br>`apps/mobile/src/components/ui/inline-error.tsx` | Canonical offline banner and inline retry error components built and styled to DESIGN.md. |
| **§68–70** | AI Data Rules, Privacy (API keys backend-only), Performance considerations | **Built** / **Conforming** | `apps/api/src/` | No LLM keys in mobile client; all client mutations use offline-first queuing with client UUIDs. |
| **§71** | MVP Acceptance Criteria (Personal profile, Workout, Nutrition, AI Planner, Progress) | **Partial** | Monorepo-wide | Workout logging core works; Onboarding, Nutrition, Progress, and Profile need slice completion per Step 2. |

---

## 2. Backend Inventory vs Spec §62

### 2.1 Existing Prisma Models (`apps/api/prisma/schema.prisma`)
1. `User` (mapped to `users`)
2. `UserEquipment` (mapped to `user_equipment`)
3. `UserPreferences` (mapped to `user_preferences`)
4. `Exercise` (mapped to `exercises`)
5. `Workout` (mapped to `workouts`)
6. `WorkoutExercise` (mapped to `workout_exercises`)
7. `WorkoutSet` (mapped to `workout_sets`)
8. `RefreshToken` (mapped to `refresh_tokens`)

### 2.2 Spec §62 Table Audit & Missing Fields

| §62 Spec Table | Existing Prisma Model? | Missing / Non-Conforming Fields |
| :--- | :---: | :--- |
| **Users** | `User` (Yes) | Missing: `age` (has nullable `dateOfBirth`), `gender`, `height`, `weight`, `target_weight`, `workout_duration`. (Goal and experience are placed on `UserPreferences`). |
| **User Equipment** | `UserEquipment` (Yes) | Enum `Equipment` has only 8 items instead of all 12 spec equipment items. |
| **User Preferences** | `UserPreferences` (Yes) | Has `avoidExercises`. Missing: `preferred_equipment`, `preferred_exercises`, `dietary_preferences`. |
| **Exercises** | `Exercise` (Yes) | Missing: `alternative_exercises` (string array / relation). |
| **Workouts** | `Workout` (Yes) | Missing: `program_id` (foreign key to Programs), `status` enum (`in_progress`, `completed`, `cancelled`). Schema has `note` (singular); spec has `notes`. |
| **Workout Exercises** | `WorkoutExercise` (Yes) | Matches spec (`order` is represented as `position`). |
| **Workout Sets** | `WorkoutSet` (Yes) | Missing: `rpe` (nullable per spec §62), `rest_time` (seconds), `notes`. |
| **Programs** | **MISSING** | Entire model missing: `program_id, user_id, program_name, goal, frequency, duration, created_at, status`. |
| **Program Exercises** | **MISSING** | Entire model missing: `id, program_id, day, exercise_id, sets, rep_min, rep_max, target_rir, rest_seconds, order`. |
| **Foods** | **MISSING** | Entire model missing: `food_id, name, serving_size, calories, protein, carbs, fat, source`. |
| **Food Logs** | **MISSING** | Entire model missing: `food_log_id, user_id, food_id, quantity, meal_type, meal_time, calories, protein, carbs, fat, source`. |
| **Body Progress** | **MISSING** | Entire model missing: `progress_id, user_id, date, weight, body_fat, notes`. |
| **AI Conversations** | **MISSING** | Phase 6 (`conversation_id, user_id, title, created_at, updated_at`). |
| **AI Messages** | **MISSING** | Phase 6 (`message_id, conversation_id, role, content, timestamp`). |
| **AI Insights** | **MISSING** | Phase 6 (`insight_id, user_id, category, title, observation, evidence, possible_factors, recommendation, confidence, created_at`). |

### 2.3 Existing API Endpoints (`apps/api/src`)

- **Auth Controller (`/auth`)**:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- **Onboarding Controller (`/onboarding`)**:
  - `POST /onboarding` (completes user profile, equipment, preferences)
- **Exercises Controller (`/exercises`)**:
  - `GET /exercises` (search by query, muscle, equipment, difficulty, pagination)
  - `GET /exercises/:id`
- **Workouts Controller (`/workouts`)**:
  - `GET /workouts` (list user workouts)
  - `GET /workouts/previous?exerciseId=&exclude=` (previous session lookup)
  - `POST /workouts` (create workout with exercises & sets)
  - `GET /workouts/:id` (fetch workout detail)
  - `GET /workouts/:id/summary` (fetch workout summary metrics)
  - `PATCH /workouts/:id` (update workout name/note/completedAt)
  - `DELETE /workouts/:id` (soft-delete workout)
  - `POST /workouts/:id/exercises` (upsert workout exercise)
  - `DELETE /workouts/:id/exercises/:exerciseRowId`
  - `POST /workouts/:id/exercises/:exerciseRowId/sets` (upsert workout set)
  - `DELETE /workouts/:id/sets/:setId`
- **App Controller (`/`)**:
  - `GET /` (health / greeting)

### 2.4 Missing API Endpoints per Spec
- **Auth**: `POST /auth/forgot-password`, `POST /auth/reset-password` (§3.3)
- **Profile / Users**: `PATCH /users/me` (update name, age, height, weight, target weight), `POST /auth/change-password`, `GET /users/me/preferences`, `PATCH /users/me/preferences` (§65)
- **Nutrition**: `GET /foods/search`, `POST /foods`, `GET /food-logs`, `POST /food-logs`, `PATCH /food-logs/:id`, `DELETE /food-logs/:id` (§24–28)
- **Progress**: `GET /progress/weight`, `POST /progress/weight`, `GET /progress/strength/:exerciseId`, `GET /progress/volume`, `GET /progress/consistency` (§44–49)
- **Programs**: `GET /programs`, `POST /programs`, `GET /programs/:id` (§33–38)

---

## 3. Mock & Fixture Data Audit vs Backend

| Screen / Flow | Mock / Fixture Elements | Backend Status |
| :--- | :--- | :--- |
| **Home (`(app)/index.tsx`)** | - Next Workout hero card ("Pull Day", "Pull · 44 min · 5 exercises") is hardcoded.<br>- Calories MetricCard (1,840 kcal, sparkline [1650, 1900, 1780, 2120, 1840]).<br>- Workouts MetricCard (3 done of 4, sparkline).<br>- Body Weight MetricCard (72.4 kg, sparkline [73.5, 73.1, ...]).<br>- Training Volume MetricCard (14,250 kg, sparkline).<br>- InsightCard ("Upper body volume on track..."). | No aggregated dashboard endpoint exists. Needs live data or real query connections. |
| **Train (`(app)/train.tsx`)** | - "Today's Session" hero card is hardcoded static data.<br>- "My Program" has 4 static mock rows (Day 1..Day 4).<br>- Planner insight card is static.<br>- "History" has 2 hardcoded static rows ("Pull Day", "Lower Body Strength") instead of `GET /workouts`. | Exercise search uses real backend `GET /exercises`. Program & history rows are static fixtures. |
| **Food (`(app)/food.tsx`)** | - Week strip dates and active selection.<br>- Macro targets (142/160g protein, 195/240g carbs, 58/70g fat).<br>- All meal items (Breakfast: Oatmeal, Eggs; Lunch: Chicken Bowl; Dinner: Salmon; Snacks: Greek Yogurt).<br>- Add/Edit meal sheet does not submit anywhere. | **100% Mock Fixture Data**. Zero backend endpoints or tables exist for food logging. |
| **Metric Detail (`metric/[id].tsx`)** | - `METRIC_CONFIGS` dictionary hardcodes all values, date ranges ("Oct 5–11, 2026"), and chart series for Weight, Calories, Volume, and Workouts.<br>- Add log button opens sheet that only closes without saving. | **100% Mock Fixture Data**. No backend progress models or queries exist. |
| **You / Profile (`(app)/you.tsx`)** | - Subtitle hardcoded "BUILD MUSCLE · INTERMEDIATE".<br>- Goals subtitle hardcoded "Hypertrophy · 2,200 kcal".<br>- Equipment subtitle hardcoded "Barbell, Dumbbells, Cables, Bench".<br>- Edit sheets for Units and Days mutate local component state only, never calling backend. | Only user name and email read from `authStore.user`. Preferences are not saved back to API. |
| **Coach (`(app)/coach.tsx`)** | - Hardcoded conversation mock. | Phase 6 feature. |

---

## 4. Visual Result Status

> **Visual Result:** **NOT verified**  
> `adb` was executed; no connected Android devices or emulators were detected in this environment. As required by Step 1 instructions, no visual rendering correctness is claimed until execution against an active emulator or device.

---

## 5. Other Unmet Spec Requirements

1. **Design Token Corrections (§3.5 of DESIGN.md):**
   - Type scale in `theme.ts` needs exact synchronization with DESIGN.md §3.5: `largeTitle: 34/40`, `title: 28/34`, `sectionTitle: 22/28`, `metricHero: 48/52`, `metricValue: 36/40`, `unit: 17`, `cardLabel: 17 semibold` in accentText (not 12 uppercase), `body: 17/24`, `secondary: 15/20`, `eyebrow: 13 uppercase`, `caption: 12`.
   - Contrast ratios for accent-on-white, white-on-accent, accentText-on-cream, inkMutedText-on-cream must be measured and documented in `DECISIONS.md`.
   - Primary button font size should be 18sp bold.
2. **Set Row Hit Targets & Columns:**
   - Active workout set row must format as: `Set | Previous | Weight | Reps | RIR | Done` with min 48dp touch targets on all interactive controls.
3. **Rest Timer Options (§19):**
   - Rest timer must support 30s, 60s, 90s, 120s, 180s, and Custom duration options.
4. **Workout Summary (§21):**
   - Performance delta vs previous session per exercise (+2.5 kg compared with previous session, +4.2% total volume) is missing from summary computation and screen.
5. **Dark Card Restriction (DESIGN.md §7.2 vs Active Workout):**
   - Active workout currently uses a dark hero card (`colors.ink`). DESIGN.md allows only a single dark hero card in the entire app (Home "Next Workout"). Active workout must use a standard surface card.
