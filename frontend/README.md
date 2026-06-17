# 🎨 Frontend Client: Component Architecture, Files and Micro-Agents

This service runs our React web client, manages state using Context API and displays geotagged image markers on an interactive Leaflet map.

---

## 🛠️ File Breakdown & Improvements

### `src/api.js`
- **What was done**: Set up the base Axios client. Implemented response interceptors to watch for renewed JWT credentials.
- **Benefits**: Intercepts silent token updates sent by the server and updates credentials dynamically without user interruption.

### `src/context/AuthContext.jsx`
- **What was done**: Created global context state for users. Ensured `window.localStorage` calls check if environment window variables exist.
- **Benefits**: Centralized login, signup and logout state. Eliminates JSDOM testing crashes under Node environments where local storage is undefined.

### `src/components/Map/MapPage.jsx`
- **What was done**: Integrates photo listings with map bounds. Dynamically calls endpoint queries when boundaries change.
- **Benefits**: Serves as the primary coordinate hub, synchronizing the sidebar, detail modals and active pins.

### `src/components/Map/MapView.jsx`
- **What was done**: Constructed the Leaflet container, added a floating `"Search map viewport"` widget and configured `moveend` listeners.
- **Benefits**: Optimizes memory rendering by querying only visible photos. Groups pins into beautiful clusters at low zoom levels.

### `src/components/Upload/UploadModal.jsx`
- **What was done**: Built the drag and drop upload panel. Connected EXIF parsing and manual pin positioning on a mini-map.
- **Benefits**: Allows zero-friction uploads. Automatically reads GPS details from images, but lets users override coordinates manually.

### `src/components/PhotoModal/PhotoModal.jsx`
- **What was done**: Designed the details modal, added copy coordinates links, integrated speech reader buttons, added owner delete controls and AI description updates.
- **Benefits**: Multi-functional details hub. Provides interactive voice readings, immediate comments updates, author controls and descriptions editing.

---

## 🧪 Unit Test Suite Breakdown

### `src/tests/unit/AuthPage.test.tsx`
- **What was done**: Verifies tab toggles, form fields, password security displays and successful user logins.
- **Benefits**: Ensures users can sign up and login without form errors.

### `src/tests/unit/UploadModal.test.tsx`
- **What was done**: Verifies mock file drops, manual coordinate changes and upload callbacks.
- **Benefits**: Ensures the upload form handles files and validates coordinate entries.

### `src/tests/unit/PhotoModal.test.tsx`
- **What was done**: Verifies modal loaders, owner-specific deletes, comments submissions and AI refreshes.
- **Benefits**: Complete coverage of photo metadata, author permissions, nested conversations and text updates.

---

## 🤖 Autonomous Frontend Subagents & Daemons

The client uses 6 subagents to handle heavy computations, network synchronization and accessibility features:

1. **EXIF Coordinate Extractor Subagent**  
   Reads image metadata directly inside the browser using client resources. It resolves geolocation details immediately without taxing server CPU.

2. **Viewport Bounding-Box Poller Subagent**  
   Monitors map dragging. It calculates new boundary coordinates and triggers filtered data updates when the search viewport switch is active.

3. **Credential Synchronization Subagent**  
   Sits inside the network transport layer. It detects new tokens in response headers and silently replaces old values in local storage.

4. **AI Status Refresh Subagent**  
   Spawns when a photo details card is opened with a missing description. It runs a 3-second network polling loop until the description is ready.

5. **Text-To-Speech Speech Narration Subagent**  
   Accesses browser accessibility APIs. It formats text, monitors playback events and reads aloud AI generated summaries.

6. **Leaflet Geo-Clustering Subagent**  
   Calculates marker clusters in real time based on zoom levels, reducing DOM weight and keeping map animations running at 60 FPS.
