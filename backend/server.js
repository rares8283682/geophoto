require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB, getClient } = require('./db');
const { authRateLimiter } = require('./middleware/limiter');

const authRoutes    = require('./routes/auth');
const photoRoutes   = require('./routes/photos');
const commentRoutes = require('./routes/comments');

const app  = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (Rate limit auth routes to max 10 requests per minute)
app.use('/auth',     authRateLimiter(10, 60 * 1000), authRoutes);
app.use('/photos',   photoRoutes);
app.use('/comments', commentRoutes);

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n🚀  GeoPhoto API  →  http://localhost:${PORT}`);
    console.log(`📁  Uploads       →  http://localhost:${PORT}/uploads/<filename>\n`);
    if (!process.env.GEMINI_API_KEY) {
      console.log('💡  Tip: add GEMINI_API_KEY to .env to enable AI photo descriptions.\n');
    }
  });
}

start().catch(err => { console.error('Failed to start server:', err); process.exit(1); });

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  try {
    const db = getClient();
    db.close();
    console.log('✅ SQLite connection closed.');
  } catch (err) {
    console.warn('⚠️ Error closing SQLite connection:', err.message);
  }
  process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
