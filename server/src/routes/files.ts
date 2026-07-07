import express from 'express';
const router = express.Router();
import db from '../config/db';
import { generateDownloadUrl } from '../config/s3';
import { requireAuth } from '../middlewares/requireAuth';

router.use(requireAuth);

// GET /api/files
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM files WHERE deleted_at IS NULL AND user_id = $1 ORDER BY created_at DESC', [req.session.userId]);
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
      `UPDATE files SET folder_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [folder_id || null, id, req.session.userId]
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
    await db.query(`UPDATE files SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, [req.params.id, req.session.userId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/files/:id/restore
router.put('/:id/restore', async (req, res, next) => {
  try {
    await db.query(`UPDATE files SET deleted_at = NULL WHERE id = $1 AND user_id = $2`, [req.params.id, req.session.userId]);
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
    
    await db.query(`UPDATE files SET filename = $1 WHERE id = $2 AND user_id = $3`, [name, id, req.session.userId]);
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
    
    await db.query(`UPDATE files SET is_starred = $1 WHERE id = $2 AND user_id = $3`, [!!is_starred, id, req.session.userId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
