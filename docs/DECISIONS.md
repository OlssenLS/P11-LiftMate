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

## 2026-10-07 — UI Redesign Slices B–E (Primitives, Navigation, Screens & Polish)

- Built 14 canonical primitives in `components/ui` matching DESIGN.md §6.
- Floating pill tab bar with detached Coach circle button opening full-height Sheet (DESIGN.md §5 & §14.1).
- Single dark hero card on Home ("Next workout") only, flat white/surface cards elsewhere (DESIGN.md §7.2 & §14.2).
- Single accent system with no per-domain rainbow colours (DESIGN.md §14.3).
- Offline banner slim pill ("Offline — changes will sync") mounted under headers across screens with zero-dependency network listener (DESIGN.md §9).
- Reduced motion support in skeletons and chart primitives (DESIGN.md §10).
- Extended haptic vocabulary with `notifyWarning` for destructive confirms (DESIGN.md §10).


