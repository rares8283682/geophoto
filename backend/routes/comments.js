const express = require('express');
const { query, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /comments/:photoId
router.get('/:photoId', async (req, res) => {
  try {
    const comments = await query(
      `SELECT c.id, c.body, c.created_at, u.email AS author_email
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.photo_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.photoId]
    );
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /comments/:photoId
router.post('/:photoId', authMiddleware, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim())
      return res.status(400).json({ error: 'Comment body is required' });

    const photos = await query('SELECT id FROM photos WHERE id = ?', [req.params.photoId]);
    if (!photos.length) return res.status(404).json({ error: 'Photo not found' });

    const { lastInsertRowid } = await run(
      'INSERT INTO comments (photo_id, user_id, body) VALUES (?, ?, ?)',
      [req.params.photoId, req.user.id, body.trim()]
    );

    const rows = await query(
      `SELECT c.id, c.body, c.created_at, u.email AS author_email
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [lastInsertRowid]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
