# Life OS Flutter App

Mobile companion app for Life OS, connecting to your existing Next.js backend.

## Setup

1. Install Flutter SDK (>=3.3.0)
2. Clone or copy this directory
3. Run: flutter pub get

## Configuration

The app connects to your Life OS backend. By default it targets http://10.0.2.2:3000 (Android emulator → host localhost).

To use your Vercel deployment, either:
- Edit lib/core/constants.dart and change defaultValue in kApiBaseUrl
- Or pass --dart-define=API_URL=https://your-app.vercel.app when running

## Running

# Android emulator (default)
flutter run

# With your Vercel URL
flutter run --dart-define=API_URL=https://your-app.vercel.app

# iOS simulator
flutter run --dart-define=API_URL=http://127.0.0.1:3000

## Backend REST API

The Next.js backend was extended with REST endpoints at /api/v1/:
- GET/POST /api/v1/tasks
- GET/PUT/DELETE /api/v1/tasks/:id
- POST /api/v1/tasks/:id/toggle
- GET /api/v1/today
- GET /api/v1/search
- GET/POST /api/v1/areas, /projects, /tags
- GET/POST /api/v1/notes, /notes/:id
- GET/POST /api/v1/habits, /habits/:id/check
- GET/POST /api/v1/goals, /goals/:id
- GET/POST /api/v1/events, /events/:id
- GET/POST /api/v1/finance/accounts, /transactions, /budgets, /subscriptions
- GET /api/v1/finance/summary

## Authentication

Uses the same Better Auth session as the web app. The Flutter app POSTs to
/api/auth/sign-in/email and stores the session cookie using a persistent
cookie jar (dio_cookie_manager).

## Features
- Today view with progress bar
- Full task management (create, edit, delete, complete)
- Swipe gestures (right=complete, left=tomorrow/delete)
- Notes tree (view and edit note content)
- Finance (accounts, transactions, budgets, subscriptions)
- Habits tracking with daily check-ins
- Goals with progress tracking
- Events & countdowns
- AI Assistant chat
- Settings (theme, server URL, sign out)
