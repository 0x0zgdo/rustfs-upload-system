import express from 'express';
const router = express.Router();
import db from '../config/db';
import {  generateDownloadUrl  } from '../config/s3';

// GET /api/content
router.get('/', async (req, res, next) => {
  try {
    const folderId = req.query.folder_id || null;
    
    const folderQuery = folderId 
      ? `SELECT * FROM folders WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY name ASC`
      : `SELECT * FROM folders WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY name ASC`;
    const folderResult = await db.query(folderQuery, folderId ? [folderId] : []);
    
    const fileQuery = folderId
      ? `SELECT * FROM files WHERE folder_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`
      : `SELECT * FROM files WHERE folder_id IS NULL AND deleted_at IS NULL ORDER BY created_at DESC`;
    const fileResult = await db.query(fileQuery, folderId ? [folderId] : []);
    
    const filesWithThumbs = await Promise.all(fileResult.rows.map(async (file) => {
      if (file.thumbnail_key) {
        file.thumbnail_url = await generateDownloadUrl(file.thumbnail_key);
      }
      return file;
    }));
    
    res.json({ folders: folderResult.rows, files: filesWithThumbs });
  } catch (error) {
    next(error);
  }
});

export default router;
