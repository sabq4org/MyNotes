# MyNotes Frontend

React + Vite + Tailwind CSS frontend for the MyNotes app. See the [root README](../README.md) for project overview.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Make sure the backend is running on `http://localhost:4000` (Vite proxies `/api` to it).

## Scripts

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — production build into `dist/`.
- `npm run preview` — preview the built bundle locally.
- `npm run lint` — ESLint check.

## Layout

- `src/api/` — axios client + endpoint wrappers (auth, projects).
- `src/context/AuthContext.jsx` — auth state, bootstrap status, login/logout.
- `src/lib/storage.js` — JWT in `localStorage`.
- `src/lib/errors.js` — server error code → Arabic message.
- `src/components/` — reusable UI: `AppHeader`, `Modal`, `ConfirmDialog`, `ProjectCard`, `ProjectFormModal`, `PinInput`, …
- `src/pages/` — `SetupPage`, `LoginPage`, `DashboardPage`.
- `src/index.css` — Tailwind base + component classes (`.btn-primary`, `.input`, `.card`).

## Routing logic

`App.jsx` chooses the screen based on backend state and local token:
- `bootstrapping` → full-screen spinner while `/api/auth/status` is in flight.
- Server unreachable → minimal retry card.
- Not authenticated AND `isSetup === false` → `SetupPage`.
- Not authenticated AND `isSetup === true` → `LoginPage`.
- Authenticated → router with `/` → `DashboardPage` (more routes added in Phase 3).

## Dev proxy

`vite.config.js` proxies `/api/*` to the backend, so the frontend uses same-origin requests in development without any CORS configuration.

## RTL & fonts

The HTML root is set to `lang="ar" dir="rtl"`. Fonts are loaded from Google Fonts (`IBM Plex Sans Arabic` + `Inter`).
