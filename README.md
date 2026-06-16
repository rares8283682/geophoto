# 🗺️ GeoPhoto — Interactive Geotagged Photo Map

This is a a full-stack web application where users can sign up or log in, upload geotagged photos and insert their GPS coordinations
and explore them on an interactive map. Clicking a photo marker opens a detail panel with the image, an AI-generated(this needs API tokens) description and a comments thread.

---

## Quick Start (Local)

You need **Node.js ≥ 18** installed. I try to do a version using Docker too !

### 1. Backend

```bash
cd backend
cp .env.example .env          # copy env template
# (Optional) add your Gemini API key to .env for AI descriptions
npm install
npm run dev                   # starts on http://localhost:3001
```

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Features

Feature

Sign up / Log in (JWT)
Upload geotagged photos
Auto-detect GPS from EXIF
Manual pin placement on mini-map 
Interactive map (dark theme, clustered)
Photo thumbnail markers
Photo detail modal
Comments (per photo)
AI photo description (Gemini)

---

## AI Description Setup

1. I get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add it to `backend/.env`:
   ```
   #to this exactly code:
   GEMINI_API_KEY=your-key-here
   ```
3. Restart the backend. Descriptions are generated automatically on upload and appear in the photo modal.

---

## Architecture

```
Browser (React + Leaflet)
        │  REST (JSON + multipart/form-data)
        ▼
  Express.js API (Node 18+)
  ├── /auth        signup, login → JWT
  ├── /photos      upload, list, get, delete
  ├── /comments    list, post
  └── /uploads/*   static image files
        │
        ├── SQLite DB (libsql/client — file:geophotos.db)
        └── /uploads directory (images on disk)
```

### Key design decisions

- **`@libsql/client`** (pure JS SQLite driver) — no native compilation needed, works on any platform
- **EXIF parsed client-side** with `exifr` — no server dependency, instant feedback
- **AI description fire-and-forget** — upload response is instant; the modal polls every 3s until the description arrives
- **`react-leaflet-cluster`** — handles 10k+ markers at scale by grouping them at low zoom levels
- **Dark CartoDB tiles** — matches the app's dark theme seamlessly
- **Spatial index** on `photos(lat, lng)` + optional `?bbox=` query parameter for viewport-based fetching at scale

---

## Project Structure

```
geophotos/
├── backend/
│   ├── .env.example
│   ├── server.js          # Express entry point
│   ├── db.js              # libsql/client setup + query helpers
│   ├── middleware/auth.js # JWT middleware
│   └── routes/
│       ├── auth.js        # POST /auth/signup, /auth/login
│       ├── photos.js      # GET/POST/DELETE /photos
│       └── comments.js    # GET/POST /comments/:photoId
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx
        ├── index.css       # Full design system
        ├── api.js          # Axios base client
        ├── context/AuthContext.jsx
        └── components/
            ├── Auth/AuthPage.jsx
            ├── Map/MapPage.jsx
            ├── Map/MapView.jsx          # Leaflet + clusters
            ├── Upload/UploadModal.jsx   # EXIF + mini-map + upload
            └── PhotoModal/PhotoModal.jsx # Detail + AI + comments
```

---

## Production Deployment (outline)

Layer | Recommended service |

Frontend | Vercel (free, CDN) |
Backend + DB | Railway / Render (Node.js + persistent disk) |
Image storage | Swap `/uploads` for AWS S3 + presigned URLs |
AI | Gemini API key as env var |

---

## Scaling to 10k Photos

1. **Clustering** — `react-leaflet-cluster` groups markers at low zoom, reducing DOM nodes drastically
2. **Viewport fetching** — use `GET /photos?bbox=lat1,lng1,lat2,lng2` to only load visible photos
3. **Thumbnails** — serve a resized 400px thumbnail for markers, full image on demand (use Sharp or ImageMagick)
4. **CDN** — serve `/uploads` from a CDN (CloudFront) with aggressive cache headers
5. **PostGIS** — migrate from SQLite to PostgreSQL + PostGIS for true spatial queries at scale
