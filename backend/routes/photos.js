const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { query, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Multer ─────────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only images')),
});

// ── AI description ─────────────────────────────────────────────────────────
async function generateAIDescription(filePath) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model  = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const ext    = path.extname(filePath).slice(1).toLowerCase();
    const mime   = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const result = await model.generateContent([
      { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: mime[ext] || 'image/jpeg' } },
      'Describe what you see in this photo in 2–3 concise, vivid sentences. Focus on the main subject, the location feel, and any notable details.',
    ]);
    return result.response.text();
  } catch (err) {
    console.warn('⚠️  AI description failed:', err.message);
    return null;
  }
}

// ── GET /photos ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { bbox } = req.query;
    let photos;

    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length !== 4 || parts.some(isNaN))
        return res.status(400).json({ error: 'bbox must be lat1,lng1,lat2,lng2' });
      const [lat1, lng1, lat2, lng2] = parts;
      photos = await query(
        `SELECT p.id, p.filename, p.original_name, p.lat, p.lng, p.ai_description, p.created_at,
                u.email AS author_email
         FROM photos p JOIN users u ON u.id = p.user_id
         WHERE p.lat BETWEEN ? AND ? AND p.lng BETWEEN ? AND ?
         ORDER BY p.created_at DESC`,
        [Math.min(lat1, lat2), Math.max(lat1, lat2), Math.min(lng1, lng2), Math.max(lng1, lng2)]
      );
    } else {
      photos = await query(
        `SELECT p.id, p.filename, p.original_name, p.lat, p.lng, p.ai_description, p.created_at,
                u.email AS author_email
         FROM photos p JOIN users u ON u.id = p.user_id
         ORDER BY p.created_at DESC`
      );
    }
    res.json(photos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// ── GET /photos/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, u.email AS author_email
       FROM photos p JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Photo not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// ── POST /photos ───────────────────────────────────────────────────────────
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  if (isNaN(lat) || isNaN(lng)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Valid lat and lng are required' });
  }

  try {
    // Auto-rotate the uploaded image upright using sharp
    try {
      const sharp = require('sharp');
      const tempPath = req.file.path + '.tmp';
      await sharp(req.file.path).rotate().toFile(tempPath);
      fs.renameSync(tempPath, req.file.path);
      console.log('🔄 Image auto-rotated upright.');
    } catch (err) {
      console.warn('⚠️ Image rotation failed, keeping original:', err.message);
    }

    const { lastInsertRowid } = await run(
      'INSERT INTO photos (user_id, filename, original_name, lat, lng) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.file.filename, req.file.originalname, lat, lng]
    );

    const rows  = await query('SELECT * FROM photos WHERE id = ?', [lastInsertRowid]);
    const photo = rows[0];

    // Fire-and-forget AI description
    generateAIDescription(req.file.path).then(async (desc) => {
      if (desc) await run('UPDATE photos SET ai_description = ? WHERE id = ?', [desc, photo.id]);
    });

    res.status(201).json(photo);
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── DELETE /photos/:id ─────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM photos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Photo not found' });
    const photo = rows[0];
    if (photo.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const filePath = path.join(uploadDir, photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await run('DELETE FROM photos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── AI location estimation ──────────────────────────────────────────────────
async function estimateLocationFromImage(filePath) {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model  = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const ext    = path.extname(filePath).slice(1).toLowerCase();
    const mime   = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const result = await model.generateContent([
      { inlineData: { data: fs.readFileSync(filePath).toString('base64'), mimeType: mime[ext] || 'image/jpeg' } },
      'Identify where this photo was taken. Estimate its GPS coordinates (latitude and longitude). You must respond ONLY with a raw JSON object containing "lat" and "lng" properties. Example: {"lat": 48.8566, "lng": 2.3522}. Do not write any markdown code blocks, preambles, or explanation. Only return the raw JSON string.',
    ]);
    const text = result.response.text().trim();
    // Clean up any markdown blocks if the model ignored instructions
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const coords = JSON.parse(cleanJson);
    if (typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return coords;
    }
    return null;
  } catch (err) {
    console.warn('⚠️ AI location estimation failed:', err.message);
    return null;
  }
}

// ── POST /photos/estimate-location ──────────────────────────────────────────
router.post('/estimate-location', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const coords = await estimateLocationFromImage(req.file.path);
    // Delete the temp file so it doesn't clutter uploads
    fs.unlinkSync(req.file.path);

    if (!coords) {
      return res.status(422).json({ error: 'AI could not identify a location for this image.' });
    }

    res.json(coords);
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to estimate location' });
  }
});

// ── POST /photos/:id/regenerate-description ──────────────────────────────────
router.post('/:id/regenerate-description', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM photos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Photo not found' });
    const photo = rows[0];

    const filePath = path.join(uploadDir, photo.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo file not found on disk' });
    }

    const desc = await generateAIDescription(filePath);
    if (!desc) {
      return res.status(500).json({ error: 'AI failed to generate a description. Check API key/quota.' });
    }

    await run('UPDATE photos SET ai_description = ? WHERE id = ?', [desc, photo.id]);
    res.json({ message: 'Description updated successfully', ai_description: desc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to regenerate description' });
  }
});

module.exports = router;
