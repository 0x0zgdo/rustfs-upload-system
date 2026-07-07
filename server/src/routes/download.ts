import express from 'express';
const router = express.Router();
import db from '../config/db';
import { generateDownloadUrl } from '../config/s3';
import { requireAuth } from '../middlewares/requireAuth';

router.use(requireAuth);

// GET /api/download-url/:id
router.get('/download-url/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT s3_key, filename FROM files WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
    
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
    const result = await db.query('SELECT s3_key, filename FROM files WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
    
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

export default router;
