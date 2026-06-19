# GeoPhoto Backend

Express API for authentication, photo upload, map photo queries, comments and optional AI descriptions.

## Responsibilities

- Initialize the SQLite/libSQL database and indexes
- Authenticate users with JWT
- Send signup and password-reset verification codes
- Accept image uploads through multipart forms
- Store uploaded images locally for the demo version
- Auto-rotate images with Sharp
- Generate optional Gemini descriptions in the background
- Serve photos and comments through REST endpoints

## Run Locally

```bash
cp .env.example .env
npm install
npm run dev
```

The API runs on `http://localhost:3001`.
If local file watcher limits block `npm run dev`, use `npm start`.

## Environment

```ini
PORT=3001
JWT_SECRET=change-me-in-production-use-a-long-random-string
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

If SMTP is not configured, Nodemailer uses Ethereal test email accounts and returns a preview URL for local testing.

## Main Endpoints

- `POST /auth/send-signup-code`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/send-reset-code`
- `POST /auth/reset-password`
- `GET /photos`
- `GET /photos?bbox=south,west,north,east`
- `GET /photos/:id`
- `POST /photos`
- `DELETE /photos/:id`
- `POST /photos/:id/regenerate-description`
- `GET /comments/:photoId`
- `POST /comments/:photoId`

## Data Model

- `users`: email, hashed password, profile fields
- `photos`: owner, filename, original name, coordinates, AI description
- `comments`: photo, author, body, timestamp

Indexes are created for user lookup, photo owner lookup, photo coordinates and comment lookup by photo.
