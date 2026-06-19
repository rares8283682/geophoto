# GeoPhoto

GeoPhoto is a full-stack web application for uploading geotagged photos, visualizing them on an interactive map and discussing each image through comments. It includes JWT authentication, email verification, EXIF GPS extraction, manual map pin placement, clustered map markers and optional Gemini-powered image descriptions.

This repository was built for the HyLight fullstack internship technical test. The production architecture and scaling plan are documented separately in [STRATEGY.md](./STRATEGY.md).

## Features

- Sign up, email verification, login, logout and password reset
- JWT-protected photo upload and comment creation
- Browser-side EXIF GPS extraction with manual coordinate fallback
- Optional AI location estimation when GPS metadata is missing
- Interactive Leaflet map with marker clustering
- Viewport-based photo fetching through `GET /photos?bbox=...`
- Photo detail modal with image preview, coordinates, AI description, comments and owner delete action
- Optional Gemini image description generation on upload and manual regeneration
- Frontend unit tests for authentication, upload and photo detail workflows

## Tech Stack

- Frontend: React, Vite, Axios, Leaflet, React Leaflet, React Leaflet Cluster, exifr, Vitest
- Backend: Node.js, Express, Multer, Sharp, JWT, bcrypt, Nodemailer
- Database: SQLite/libSQL client
- AI: Google Gemini API, optional through `GEMINI_API_KEY`
- Local email testing: Nodemailer Ethereal fallback

## Local Setup

Requirements: Node.js 18 or newer.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API starts on [http://localhost:3001](http://localhost:3001).
If your OS file watcher limit blocks `npm run dev`, use `npm start` for the same API without watch mode.

Optional backend environment variables:

```ini
PORT=3001
JWT_SECRET=change-me-in-production-use-a-long-random-string
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

If SMTP variables are not configured, the backend creates Ethereal test emails and returns a preview URL in the signup/reset flow. That makes the verification flow testable without real email credentials.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The client starts on [http://localhost:5173](http://localhost:5173).

Optional frontend environment:

```ini
VITE_API_BASE_URL=http://localhost:3001
```

## Testing

Frontend:

```bash
cd frontend
npm test -- --run
npm run build
```

Backend syntax check:

```bash
cd backend
node -c routes/auth.js
node -c routes/photos.js
node -c routes/comments.js
```

## Project Structure

```text
geophotos/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── limiter.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── photos.js
│   │   └── comments.js
│   └── utils/mailer.js
├── frontend/
│   ├── src/api.js
│   ├── src/context/AuthContext.jsx
│   ├── src/components/Auth/AuthPage.jsx
│   ├── src/components/Map/MapPage.jsx
│   ├── src/components/Map/MapView.jsx
│   ├── src/components/Upload/UploadModal.jsx
│   └── src/components/PhotoModal/PhotoModal.jsx
└── STRATEGY.md
```

## Notes For Reviewers

- The current implementation stores uploaded files on local disk for simplicity. `STRATEGY.md` explains the production migration to object storage, CDN delivery, thumbnails and PostGIS.
- AI is optional. Without `GEMINI_API_KEY`, the app still works end to end: users can sign up, upload photos with coordinates, view them on the map and comment.
- The app already uses marker clustering and optional viewport filtering to keep the map usable as the dataset grows.
