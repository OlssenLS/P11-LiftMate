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
| **§4.1 / §5 / §5.1 (b)** | Onboarding fields: Name, Age/DOB, Gender, Height, Weight, Optional Body Fat %, Primary Goal (5 options), Optional Secondary Goal | **Built** | `apps/mobile/src/app/(onboarding)/index.tsx`<br>`packages/shared/src/auth.ts`<br>`apps/api/src/onboarding/onboarding.service.ts`<br>`apps/api/prisma/schema.prisma` | Implemented in 7-step onboarding wizard. Step 1 collects Name, DOB (derives age), Gender (`male`, `female`, `other`, `prefer_not_to_say`), Timezone; Step 2 collects Height (cm), Weight (kg), optional Body Fat %, optional Target Weight, Weight Unit; Step 3 collects Primary Goal (5 options including `body_recomposition`) and optional Secondary Goal. Persisted to `users` and `user_preferences`. |
| **§6 (c)** | Training Profile: Experience (3), Frequency (2–6 days), Duration (5 options: <30, 30–45, 45–60, 60–90, 90+ min), Location (4: Commercial gym, Home gym, Home, Outdoor) | **Built** | `apps/mobile/src/app/(onboarding)/index.tsx`<br>`packages/shared/src/auth.ts`<br>`packages/shared/src/enums.ts`<br>`apps/api/src/onboarding/onboarding.service.ts`<br>`apps/api/prisma/schema.prisma` | Implemented in Step 4 of onboarding. Captures Experience level (`beginner`, `intermediate`, `advanced`), Frequency (2–6 days/week via `DaySelector`), Workout Duration (`lt30`, `30_45`, `45_60`, `60_90`, `gt90`), and Training Location (`commercial_gym`, `home_gym`, `home`, `outdoor`). |
| **§7 (d)** | Equipment Profile: All 12 items (Barbell, Dumbbell, Cable machine, Smith machine, Leg press, Hack squat, Pulldown machine, Chest press, Machines, Pull-up bar, Resistance bands, Bodyweight) | **Built** | `packages/shared/src/enums.ts`<br>`apps/mobile/src/app/(onboarding)/index.tsx`<br>`apps/api/src/onboarding/onboarding.service.ts`<br>`apps/api/prisma/schema.prisma` | All 12 items rendered via interactive `EquipmentCard` grid in Step 5 of onboarding wizard. Persisted into `user_equipment` table via atomic deleteMany + createMany. 43 canonical starter exercises seeded across all 12 categories. |
| **§8 (e)** | Training Preferences: Preferred equipment, Preferred exercises, Exercises to avoid | **Built** | `apps/api/prisma/schema.prisma`<br>`packages/shared/src/user.ts`<br>`packages/shared/src/auth.ts`<br>`apps/mobile/src/app/(onboarding)/index.tsx`<br>`apps/api/src/onboarding/onboarding.service.ts` | Implemented in Step 6 of onboarding wizard. Preferred equipment chips filtered from user's selected equipment. Preferred exercises and exercises to avoid selectable via searchable `ExercisePicker` modal backed by real `GET /exercises` API. Persisted in `user_preferences`. |
| **§9 (f)** | Nutrition Profile: Daily calorie & protein targets, dietary preferences, "Calculate automatically" vs "Set manually" | **Built** | `apps/mobile/src/app/(onboarding)/index.tsx`<br>`packages/shared/src/nutrition-calc.ts`<br>`packages/shared/src/auth.ts`<br>`apps/api/src/onboarding/onboarding.service.ts`<br>`apps/api/prisma/schema.prisma` | Implemented in Step 7 of onboarding wizard. Supports Auto vs Manual mode. Automatically computes Mifflin-St Jeor formula based on height, weight, derived age, gender (midpoint constant -78 for other/prefer_not_to_say, labeled estimate), and training frequency. Multi-select dietary preference chips (`None`, `Vegetarian`, `Vegan`, `Halal`, `Pescatarian`, `Gluten-free`, `Dairy-free`). Persisted in `user_preferences`. |
| **§10–14 (g)** | Home Contents: Header ("Name + Goal · Experience"), Nutrition card (Calories, progress bar %, P/C/F, "View Nutrition"), Next workout card ("Start Workout" / "No workout scheduled" + "Create Workout"), Progress card (Current weight, Target weight, change this month, consistency, recent strength), AI insight actions ("View Analytics", "Ask AI Coach") | **Partial** | `apps/mobile/src/app/(app)/index.tsx` | Visual shell exists. Deficiencies: Header shows "Today" instead of user greeting + "Goal · Experience"; Nutrition card is generic MetricCard missing macros and "View Nutrition" CTA; Workout card is hardcoded without empty-state fallback ("No workout scheduled"); Progress card is split into metric cards without target weight or consistency; AI Insight has dismiss/breakdown instead of "View Analytics" & "Ask AI Coach". |
| **§15–22 (h)** | Workout Tracker: Planned & custom workouts, set fields (Weight, Reps, RIR), RIR picker (0–5+, Unknown), Add/Delete/Edit/Complete set, Notes, Rest timer (30/60/90/120/180/custom), Previous-session display, Summary (delta vs previous, total sets, volume, Save Workout button), History list & History detail | **Built** | `apps/mobile/src/app/workout/active.tsx`<br>`apps/mobile/src/app/workout/summary.tsx`<br>`apps/mobile/src/app/workout/[id].tsx`<br>`apps/mobile/src/app/(app)/train.tsx`<br>`packages/shared/src/workout.ts`<br>`apps/api/src/workouts/workouts.controller.ts` | 6-column active workout screen (fits 360dp phone without clipping, stacked fallback for <360dp or font scale ≥1.15), RIR picker bottom sheet (0–5+, Unknown), rest timer bottom panel (-15/+15s, duration presets and custom picker), undo set deletion snackbar, exercise history sheet, surface stats card (zero dark cards). Summary screen provides factual per-exercise deltas, volume change %, and Save Workout flow. Train screen renders live grouped completed history. Workout Detail screen (`/workout/[id]`) provides read-only set inspection and delete action. |
| **§23 (i)** | Exercise DB Fields: id, name, primary_muscle, secondary_muscles, equipment, movement_pattern, difficulty, instructions, alternative_exercises | **Partial** | `apps/api/prisma/schema.prisma`<br>`packages/shared/src/workout.ts`<br>`apps/api/src/exercises/exercises.service.ts` | All fields present except `alternative_exercises` (missing in Prisma and shared DTOs). |
| **§24–28 (j)** | Nutrition: Daily overview, Food Journal (meals), Add food methods (Manual, AI, Food DB search), Manual entry fields (Name, Serving size, Quantity, Calories, Protein, Carbs, Fat, Meal type, Meal time), Food DB structure & search | **Built** | `apps/api/src/nutrition/`<br>`apps/mobile/src/app/(app)/food.tsx`<br>`packages/shared/src/nutrition.ts` | Complete vertical slice (Migration M-D): Daily overview with rolling week strip, Food Journal grouped by meal, Catalog search, Custom food entry, real API persistence and daily macro targets tracking. |
| **§29–32** | AI Food Recognition: Camera/upload, multi-food detection, portion estimation, nutrition calculation, confidence warning | **Built** | `apps/api/src/ai/food/`<br>`apps/mobile/src/features/nutrition/ai-food-recognition-modal.tsx`<br>`apps/mobile/src/app/(app)/food.tsx`<br>`packages/shared/src/ai.ts` | Complete vertical slice (Slice AI4): Multimodal Gemini vision pipeline with fallback, strict food database nutrition calculation (Brief §4 rule 11), portion multiplier calculation, mandatory estimate badge (rule 13) and low-confidence warning (Spec §32), multi-item interactive confirmation sheet with editable portions and item deletion, 1-tap Camera header button and Add Food Sheet shortcut. |
| **§33–38 (l)** | AI Workout Planner & Programs: Programs model (`program_id, user_id, program_name, goal, frequency, duration, status`), Program Exercises (`id, program_id, day, exercise_id, sets, rep_min, rep_max, target_rir, rest_seconds, order`), pre-filled workout generation | **Built** | `apps/api/prisma/schema.prisma`<br>`packages/shared/src/program.ts`<br>`packages/shared/src/ai.ts`<br>`apps/api/src/programs/`<br>`apps/api/src/ai/planner/`<br>`apps/mobile/src/features/program/`<br>`apps/mobile/src/app/(app)/train.tsx`<br>`apps/mobile/src/app/(app)/index.tsx`<br>`apps/mobile/src/features/workout/active-workout-store.ts` | Complete end-to-end integration: Migration M-C applied adding `programs` and `program_exercises` tables to PostgreSQL with `ProgramStatus` enum. Shared schemas implemented in `packages/shared/src/program.ts` & `packages/shared/src/ai.ts`. 6 evidence-based starter templates defined. RuleEngine implemented with equipment compatibility and avoid-list substitution. Complete Programs API (`GET /programs`, `GET /programs/current`, `GET /programs/templates`, `POST /programs`, `GET /programs/:id`, `POST /programs/:id/activate`, `POST /programs/:id/start-day/:day`). AI Workout Planner (`POST /ai/planner/generate`, `POST /ai/planner/confirm`) with strict DB exercise validation filter and deterministic fallback. Mobile UI: `AiPlannerModal` for routine configuration/preview/activation, Train screen "Today's Session", "My Program" day list, and Home "Next workout" hero card. |
| **§39–43** | AI Coach: Chat interface, suggested questions, context retrieval architecture, safety & medical disclaimer | **Built** | `apps/mobile/src/app/(app)/coach.tsx`<br>`apps/mobile/src/features/coach/`<br>`apps/api/src/ai/coach/`<br>`apps/api/src/ai/provider/`<br>`apps/api/prisma/schema.prisma`<br>`packages/shared/src/ai.ts` | Migration M-F added `ai_conversations` and `ai_messages`. `AiProvider` abstraction with Gemini API integration & deterministic fallback. Context retrieval pipeline reads structured factual metrics (profile, program, recent workouts, volume, RIR, macros, PRs). Server-side rate limiting (50 req/day). Mobile chat interface with medical disclaimer, dynamic suggested questions, message thread, and typing indicator. |
| **§44–49 (k)** | Progress Tracking: Body weight log & history, Per-exercise strength view (best weight, best reps, volume, history, chart), Estimated 1RM (labelled estimate), Volume breakdowns (exercise, muscle group, workout, week, month), Consistency (% planned vs completed) | **Built** | `apps/mobile/src/app/metric/[id].tsx`<br>`apps/mobile/src/features/progress/`<br>`apps/api/src/progress/`<br>`apps/api/prisma/schema.prisma`<br>`packages/shared/src/progress.ts` | Complete end-to-end integration (Slices PRG0–PRG2): Migration M-E (`body_weight_logs`, `exercise_personal_records`), shared schemas with Epley estimated 1RM formula, backend ProgressModule (6 endpoints), TanStack query hooks in `apps/mobile/src/features/progress/`, and live metric detail screens with interactive log sheet and sparklines/charts. |
| **§50–57** | AI Analytics: Metrics calculation, Structured Analytics Data, Category insights, Data sufficiency check ("Not enough data yet") | **Built** | `apps/api/src/ai/analytics/`<br>`apps/mobile/src/app/analytics.tsx`<br>`packages/shared/src/ai.ts`<br>`apps/mobile/src/features/coach/` | Complete end-to-end integration (Slice AI3): Deterministic 4-week metrics calculation (volume, adherence %, calories, protein, RIR, stagnant lift detection). Data sufficiency gate (§54) enforcing >= 3 workouts and >= 3 nutrition days before generating trends. Structured output schema (§52) with observation, evidence, possible factors, recommendation, and action triggers. Deterministic rule-based fallback engine. Dedicated mobile Analytics screen with low-data state progress counters, metric grid, plateau alert, category tabs, and live Home dashboard Potential Insight integration. |
| **§58–61** | Architecture (AI context, Planner, Analytics pipelines) | **Architectural Reference** | N/A | Reference specifications for Phase 6. |
| **§62 (m)** | Database Structure (15 tables) | **Built** | `apps/api/prisma/schema.prisma` | Full inventory detailed in Section 2 below. All 15 spec tables exist in PostgreSQL schema. |
| **§63** | Navigation Structure (Home, Workout, Nutrition, Planner, Insights, floating/entry Coach) | **Built / Conforming** | `apps/mobile/src/app/(app)/_layout.tsx`<br>`apps/mobile/src/components/ui/tab-bar.tsx` | Tab bar is 4 tabs (`Home · Train · Food · You`) in the floating pill plus a detached 64dp Coach circle button opening the Coach sheet, as Step 0 confirmed. (Future route adjustments gated on user approval). |
| **§64** | AI Coach Entry Points (Home, Analytics, Workout, Nutrition, Planner) | **Built** | Various screens | Header/card shortcuts: Home screen InsightCard "Ask AI Coach" shortcut, floating pill Coach button, and `/coach` route. |
| **§65 (g)** | Profile & Settings: Displays Name, Age, Height, Weight, Goal, Experience, Training Frequency; Actions: Edit Profile, Edit Goals, Edit Equipment, Edit Nutrition Target, Edit Preferences, Notification Settings, Account Settings, Logout | **Built** | `apps/mobile/src/app/(app)/you.tsx`<br>`apps/api/src/users/users.controller.ts`<br>`apps/api/src/users/users.service.ts`<br>`packages/shared/src/user.ts` | Displays Name, Email, Age (derived from DOB), Goal, Experience, and complete Body Metrics (Height, Weight, Body Fat %, Target Weight, Gender, Duration, Location) with "Add" for null fields. Interactive sheets implemented with real API persistence: Edit Profile (`PATCH /users/me`), Edit Goals (`PATCH /users/me/preferences`), Edit Schedule (`PATCH /users/me`), Edit Equipment (`PUT /users/me/equipment`), Edit Preferences, Notification Settings, Units, and Change Password (`POST /users/me/change-password`). |
| **§66** | Notification System: Workout reminder, Nutrition reminder, Progress reminder, AI Insight | **Built** | `apps/mobile/src/app/(app)/you.tsx`<br>`apps/api/src/users/users.controller.ts`<br>`apps/api/prisma/schema.prisma` | Implemented in Notification Settings sheet in You screen. Persists 4 toggles (`notifications_workout_reminder`, `notifications_nutrition_reminder`, `notifications_progress_reminder`, `notifications_ai_insight`) to `user_preferences` table via `PATCH /users/me/preferences`. |
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
9. `PasswordResetToken` (mapped to `password_reset_tokens`)
10. `Program` (mapped to `programs` — Migration M-C)
11. `ProgramExercise` (mapped to `program_exercises` — Migration M-C)
12. `Food` (mapped to `foods` — Migration M-D)
13. `FoodLog` (mapped to `food_logs` — Migration M-D)
14. `BodyWeightLog` (mapped to `body_weight_logs` — Migration M-E)
15. `ExercisePersonalRecord` (mapped to `exercise_personal_records` — Migration M-E)
16. `AiConversation` (mapped to `ai_conversations` — Migration M-F)
17. `AiMessage` (mapped to `ai_messages` — Migration M-F)
18. `AiInsight` (mapped to `ai_insights` — Migration M-F)

### 2.2 Spec §62 Table Audit & Missing Fields

| §62 Spec Table | Existing Prisma Model? | Missing / Non-Conforming Fields |
| :--- | :---: | :--- |
| **Users** | `User` (Yes) | Conforming (stores dateOfBirth, gender, height, weight, targetWeight, workoutDuration, etc.). |
| **User Equipment** | `UserEquipment` (Yes) | Conforming (all 12 canonical equipment items supported). |
| **User Preferences** | `UserPreferences` (Yes) | Conforming (stores preferredEquipment, preferredExercises, dietaryPreferences, avoidExercises, notification flags). |
| **Exercises** | `Exercise` (Yes) | Conforming (includes alternativeExercises, muscle groups, equipment, movement patterns). |
| **Workouts** | `Workout` (Yes) | Conforming (includes status enum, programId, notes, soft-delete). |
| **Workout Exercises** | `WorkoutExercise` (Yes) | Conforming (order represented as position, soft-delete). |
| **Workout Sets** | `WorkoutSet` (Yes) | Conforming (includes weight, reps, rir, rirUnknown, rpe, restTime, notes, soft-delete). |
| **Programs** | `Program` (Yes) | Conforming (Migration M-C: program_id, user_id, program_name, goal, frequency, duration, status, created_at). |
| **Program Exercises** | `ProgramExercise` (Yes) | Conforming (Migration M-C: id, program_id, day, exercise_id, sets, rep_min, rep_max, target_rir, rest_seconds, order). |
| **Foods** | `Food` (Yes) | Conforming (Migration M-D: food_id, name, serving_size, calories, protein, carbs, fat, source). |
| **Food Logs** | `FoodLog` (Yes) | Conforming (Migration M-D: food_log_id, user_id, food_id, quantity, meal_type, meal_time, calories, protein, carbs, fat, source). |
| **Body Progress** | `BodyWeightLog` & `ExercisePersonalRecord` (Yes) | Conforming (Migration M-E: weight tracking, body fat, notes, plus per-exercise PR tracking). |
| **AI Conversations** | `AiConversation` (Yes) | Conforming (Migration M-F: conversation_id, user_id, title, created_at, updated_at). |
| **AI Messages** | `AiMessage` (Yes) | Conforming (Migration M-F: message_id, conversation_id, role, content, metadata, created_at). |
| **AI Insights** | `AiInsight` (Yes) | Conforming (Migration M-F: insight_id, user_id, category, title, observation, evidence, possible_factors, recommendation, confidence, data_window_start/end). |

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
  - `GET /workouts` (list user workouts with `status`, `limit`, `offset` filters)
  - `GET /workouts/previous?exerciseId=&exclude=` (previous session lookup)
  - `GET /workouts/exercise-history?exerciseId=&limit=&exclude=` (recent sessions for exercise history sheet)
  - `POST /workouts` (create workout with exercises & sets)
  - `GET /workouts/:id` (fetch workout detail)
  - `GET /workouts/:id/summary` (fetch workout summary metrics and per-exercise deltas)
  - `PATCH /workouts/:id` (update workout name/notes/status/completedAt)
  - `DELETE /workouts/:id` (soft-delete workout)
  - `POST /workouts/:id/exercises` (upsert workout exercise)
  - `DELETE /workouts/:id/exercises/:exerciseRowId`
  - `POST /workouts/:id/exercises/:exerciseRowId/sets` (upsert workout set)
  - `DELETE /workouts/:id/sets/:setId`
- **Programs Controller (`/programs`)**:
  - `GET /programs` (list user programs with status filter)
  - `GET /programs/current` (active program, auto-assigns recommended template if onboarded)
  - `GET /programs/templates` (starter template library)
  - `GET /programs/:id` (program detail with exercises and days)
  - `POST /programs` (create custom program)
  - `POST /programs/:id/activate` (activate program and archive previous)
  - `POST /programs/:id/start-day/:day` (instantiate pre-filled workout with progressive overload baseline)
- **Foods Controller (`/foods`)**:
  - `GET /foods/search?q=&limit=` (search verified and custom food catalog)
  - `POST /foods` (create custom food)
  - `GET /foods/:id` (food detail)
- **Food Logs Controller (`/food-logs`)**:
  - `GET /food-logs?date=YYYY-MM-DD` (daily macro summary, meal groups, progress %, targets)
  - `POST /food-logs` (create/upsert food log entry with offline client UUID)
  - `PATCH /food-logs/:id` (update food log entry)
  - `DELETE /food-logs/:id` (soft-delete food log entry)
- **Progress Controller (`/progress`)**:
  - `GET /progress/summary` (aggregated weight, volume, consistency, and top PRs)
  - `GET /progress/weight` (weight tracking history, start/target weight, 30-day delta)
  - `POST /progress/weight` (log body weight measurement with client UUID)
  - `GET /progress/strength/:exerciseId` (best weight, best reps, max estimated 1RM via Epley, history)
  - `GET /progress/volume?range=week|month` (total volume, muscle group distribution, timeline)
  - `GET /progress/consistency` (adherence %, streak, 4-week compliance breakdown)
- **AI Coach Controller (`/ai/coach`)**:
  - `GET /ai/coach/conversations` (list user coaching conversations)
  - `GET /ai/coach/active` (get or create active coaching thread)
  - `POST /ai/coach/conversations` (create coaching conversation)
  - `GET /ai/coach/conversations/:id` (fetch conversation detail with message thread)
  - `POST /ai/coach/conversations/:id/messages` (send message, retrieve metrics context, rate limit check, generate response)
  - `GET /ai/coach/suggested-questions` (dynamic contextual questions based on user's recent workouts and nutrition)
- **AI Planner Controller (`/ai/planner`)**:
  - `POST /ai/planner/generate` (generate candidate workout program plan using user profile/equipment/schedule with strict exercise validation)
  - `POST /ai/planner/confirm` (save and activate generated program plan into database with transactional persistence)
- **AI Analytics Controller (`/ai/analytics`)**:
  - `GET /ai/analytics/overview` (and `/ai/analytics/insights`) (evaluate data sufficiency, compute deterministic 4-week metrics, return categorized insights)
  - `POST /ai/analytics/generate` (trigger fresh insight generation using LLM with deterministic fallback)
- **App Controller (`/`)**:
  - `GET /` (health / greeting)

### 2.4 Missing API Endpoints per Spec
- **Auth**: `POST /auth/forgot-password`, `POST /auth/reset-password` (§3.3)

---

## 3. Mock & Fixture Data Audit vs Backend

| Screen / Flow | Mock / Fixture Elements | Backend Status |
| :--- | :--- | :--- |
| **Home (`(app)/index.tsx`)** | - Next Workout hero card is connected to live `useCurrentProgram()` and `activeWorkoutStore` with "No workout scheduled" fallback.<br>- Calories MetricCard is connected to live `useDailyNutritionSummary(today)`.<br>- Workouts, Body Weight, and Training Volume MetricCards connected to live `useProgressSummary()`.<br>- Live InsightCard connected to live `useAnalyticsOverview()` with "View Analytics" / "Ask AI Coach" shortcut. | **100% Real Backend Integration** for all 4 metric cards, next workout card, and live AI Potential Insight card. |
| **Train (`(app)/train.tsx`)** | - "Today's Session" hero card is connected to live `useCurrentProgram()`, `useWorkoutHistory()`, and in-progress store.<br>- "My Program" section renders live program days with exercise summaries and tap-to-start action.<br>- "History" renders live completed workouts from `GET /workouts`.<br>- "AI Workout Planner" modal with candidate generation, preview tabs, and transactional activation. | **100% Real Backend Integration** (Phase 6 Slice AI2). Exercise search, Workout History, Program Days, and AI Workout Planner run on real backend API data. |
| **Food (`(app)/food.tsx`)** | - 7-day rolling week strip with date selection.<br>- Live daily calorie and macro progress vs user targets.<br>- Live meal groups (Breakfast, Lunch, Dinner, Snacks) with food items.<br>- Interactive Add Food Sheet (Catalog search with portion multiplier & custom food entry) and Delete Entry sheet with offline sync queue. | **100% Real Backend & Offline Integration** (Phase 4 Slices N0–N2). All fixtures replaced with live API and SQLite offline queue. |
| **Metric Detail (`metric/[id].tsx`)** | - Weight: Live 30-day weight history LineChart + current/target weight + interactive Log Weight bottom sheet with offline queuing.<br>- Calories: Live daily calories + target + macro ratio BarChart.<br>- Volume: Live total volume + weekly/monthly BarChart + muscle group breakdown.<br>- Workouts: Live monthly adherence % + active streak + 4-week compliance BarChart. | **100% Real Backend Integration** (Phase 5 Slices PRG0–PRG2). All 4 metric detail views run on live backend queries with dynamic charts and sparklines. |
| **You / Profile (`(app)/you.tsx`)** | - Displays live Name, Age, Height, Weight, Goal, Experience, and complete Body Metrics.<br>- Edit Profile, Goals, Schedule, Equipment, Preferences, Notifications, Units, and Change Password persist to API. | **100% Real Backend Integration** (Phase 1 Slice P4). |
| **Coach (`(app)/coach.tsx`)** | - Interactive conversation thread with user and coach bubbles.<br>- Dynamic suggested questions from live user metrics.<br>- Safety disclaimer banner per §43.<br>- Text input with rate-limited server generation. | **100% Real Backend Integration** (Phase 6 Slices AI0–AI1). Connected to `/ai/coach` endpoints with rate limiting, context retrieval, and Gemini provider / deterministic fallback. |
| **Analytics (`analytics.tsx`)** | - Dedicated analytics screen with data sufficiency check (§54) empty state, 4-card metric overview, plateau notice alert, category tabs (All, Training, Nutrition, Recovery), and full structured insight cards with "Ask AI Coach" and "Review Workout Plan" action triggers. | **100% Real Backend Integration** (Phase 6 Slice AI3). Connected to `/ai/analytics` endpoints with live metric calculation, Gemini generation, and deterministic fallback. |

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
