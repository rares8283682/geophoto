# GeoPhoto Frontend

React/Vite client for the GeoPhoto application.

## Responsibilities

- Sign in, sign up, email verification, and password reset screens
- Authenticated map workspace
- Photo search and sidebar gallery
- Leaflet map with clustered custom photo markers
- Optional viewport-based map fetching
- Upload modal with drag-and-drop, EXIF GPS extraction, manual coordinates, and mini-map pin selection
- Photo detail modal with image preview, AI description, owner delete action, coordinate copy, and comments

## Run Locally

```bash
cp .env.example .env
npm install
npm run dev
```

The client runs on `http://localhost:5173`.

## Environment

```ini
VITE_API_BASE_URL=http://localhost:3001
```

## Verification

```bash
npm test -- --run
npm run build
```
