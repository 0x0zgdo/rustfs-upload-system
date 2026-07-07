const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateUploadUrl } = require('../config/s3');
const { addThumbnailJob } = require('../config/queue');

// POST /api/upload-url
router.post('/upload-url', async (req, res, next) => {
  try {
    const { filename, mimetype } = req.body;
    if (!filename || !mimetype) {
      return res.status(400).json({ error: 'filename and mimetype are required' });
    }

    const uniqueId = require('crypto').randomUUID();
    const key = `${uniqueId}-${filename}`;
    
    const url = await generateUploadUrl(key, mimetype);
    
    res.json({ url, key });
  } catch (error) {
    next(error);
  }
});

// POST /api/metadata
router.post('/metadata', async (req, res, next) => {
  try {
    const { filename, key, size, mimetype, folder_id } = req.body;
    if (!filename || !key || size === undefined || !mimetype) {
      return res.status(400).json({ error: 'Missing required metadata fields' });
    }

    const result = await db.query(
      `INSERT INTO files (filename, s3_key, size, mimetype, folder_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [filename, key, size, mimetype, folder_id || null]
    );

    const file = result.rows[0];

    // Enqueue thumbnail generation for images
    if (mimetype.startsWith('image/')) {
      await addThumbnailJob(file.id, file.s3_key, mimetype);
    }

    res.json({ file });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
