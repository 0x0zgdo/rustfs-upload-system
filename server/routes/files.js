const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateDownloadUrl } = require('../config/s3');

// GET /api/files
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM files WHERE deleted_at IS NULL ORDER BY created_at DESC');
    const filesWithThumbs = await Promise.all(result.rows.map(async (file) => {
      if (file.thumbnail_key) {
        file.thumbnail_url = await generateDownloadUrl(file.thumbnail_key);
      }
      return file;
    }));
    res.json({ files: filesWithThumbs });
  } catch (error) {
    next(error);
  }
});

// PUT /api/files/:id/move
router.put('/:id/move', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { folder_id } = req.body;
    
    const result = await db.query(
      `UPDATE files SET folder_id = $1 WHERE id = $2 RETURNING *`,
      [folder_id || null, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/files/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query(`UPDATE files SET deleted_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/files/:id/restore
router.put('/:id/restore', async (req, res, next) => {
  try {
    await db.query(`UPDATE files SET deleted_at = NULL WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/files/:id/rename
router.put('/:id/rename', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    await db.query(`UPDATE files SET filename = $1 WHERE id = $2`, [name, id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/files/:id/star
router.put('/:id/star', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_starred } = req.body;
    
    await db.query(`UPDATE files SET is_starred = $1 WHERE id = $2`, [!!is_starred, id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
