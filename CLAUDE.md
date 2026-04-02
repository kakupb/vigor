# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server
yarn start

# Run on iOS/Android
yarn ios
yarn android

# Run tests
yarn test
yarn test:watch   # watch mode

# Run single test file
yarn test path/to/file.test.ts
```

Builds are managed via EAS (`eas build`). The app requires a dev client for custom native modules — Expo Go will not work.

## Architecture Overview

**Vigor** is a React Native / Expo 54 productivity app with German UI. It uses file-based routing via Expo Router.

### Main Tabs (`app/(tabs)/`)

| File | German label | Purpose |
|------|-------------|---------|
| `fokus.tsx` | Fokus | Pomodoro timer + ambient sounds + session tracking |
| `fortschritt.tsx` | Fortschritt | Streaks, habit completion, weekly stats |
| `planen.tsx` | Planen | Calendar-based task/event planner |
| `mehr.tsx` | Mehr | Health data, notes, analytics, settings |

Auth screens live in `app/(auth)/`. Modal routes for habits, planner entries, and notes are at `app/habit/`, `app/planner/`, and `app/note/`.

### State Management (Zustand)

Eight stores in `store/`, each following the same **offline-first sync pattern**:

1. Save immediately to **AsyncStorage** (never blocks UI)
2. Upsert to **Supabase** in the background via `lib/sync.ts`
3. Silent-fail if offline (console warning only, no thrown errors)
4. On first authenticated load, migrate any local data to cloud

Key stores:
- `authStore` — session, user, `isAuthReady`
- `userStore` — name, `hasOnboarded`, preferences (goal, dailyFocusMinutes, preferredTime)
- `focusStore` — sessions, streaks, total minutes, selected ambient sound
- `habitStore` — habits with `completedDates[]` and `completedAmounts: {}`
- `plannerStore` — calendar entries with time, category, status
- `noteStore` — notes with block-based content, tags, linked habits/entries
- `customCategoryStore` — user-defined categories for habits and planner
- `healthMetricsStore` — Apple HealthKit data (read-only, never synced to cloud)

### Data Models (`types/`)

```typescript
Habit: { id, title, kind: "boolean" | "count", category?, schedule, completedDates[], completedAmounts: {} }
PlannerEntry: { id, title, date, startTime?, endTime?, category: PlannerCategory, doneAt? }
FocusSession: { id, startedAt, durationSeconds, status: "complete" | "interrupted", pomodoroCount? }
Note: { id, title, blocks: NoteBlock[], tags[], linkedHabitIds[], linkedPlannerIds[], isPinned }
```

### Services & Hooks

- `services/` — stateless logic: `habitService` (toggle/count), `plannerService` (normalization), `focusService` (streak calc), `notificationService`, `storage.ts` (AsyncStorage abstraction)
- `hooks/` — data access: `useHabits`, `usePlanner`, `usePomodoro`, `useHealthData`, `useAppColors` (light/dark theme), `useErrorHandler`

### Backend

- **Supabase**: Auth (with Apple Sign-In), PostgreSQL (RLS enforces user isolation), Realtime not used
- **Tokens**: Stored in iOS Keychain / Android Keystore via `expo-secure-store`
- **Env vars**: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (in `.env`)

### Notable Integrations

- **Apple HealthKit** (`@kingstinct/react-native-healthkit`) — reads workouts, activity, sleep; never writes
- **iOS Home Screen Widget** — synced via `modules/widgetBridge.ts`
- **Notifications** — streak-at-risk, daily focus reminder, weekly review (all local, deep-linked)
- **Ambient sounds** — `expo-audio` for focus session background audio

### Path Aliases

`@/*` maps to the project root. Use `@/store/habitStore`, `@/components/habits/HabitCard`, etc.
