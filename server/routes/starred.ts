import express from 'express';
const router = express.Router();
import db from '../config/db';
import {  generateDownloadUrl  } from '../config/s3';

// GET /api/starred
router.get('/', async (req, res, next) => {
  try {
    const folders = await db.query(`SELECT * FROM folders WHERE is_starred = true AND deleted_at IS NULL ORDER BY name ASC`);
    const files = await db.query(`SELECT * FROM files WHERE is_starred = true AND deleted_at IS NULL ORDER BY created_at DESC`);
    
    const filesWithThumbs = await Promise.all(files.rows.map(async (file) => {
      if (file.thumbnail_key) {
        file.thumbnail_url = await generateDownloadUrl(file.thumbnail_key);
      }
      return file;
    }));
    
    res.json({ folders: folders.rows, files: filesWithThumbs });
  } catch (error) {
    next(error);
  }
});

export default router;
