const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateDownloadUrl } = require('../config/s3');

// GET /api/download-url/:id
router.get('/download-url/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT s3_key, filename FROM files WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];
    const url = await generateDownloadUrl(file.s3_key, file.filename);
    
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// GET /api/preview-url/:id
router.get('/preview-url/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT s3_key, filename FROM files WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];
    const url = await generateDownloadUrl(file.s3_key, file.filename, true);
    
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
