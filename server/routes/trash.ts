import express from 'express';
const router = express.Router();
import db from '../config/db';
import {  deleteObject  } from '../config/s3';

// GET /api/trash
router.get('/', async (req, res, next) => {
  try {
    // 1. Lazy Cleanup: Permanently delete anything in trash > 30 days
    const expiredFiles = await db.query(`SELECT id, s3_key, thumbnail_key FROM files WHERE deleted_at < NOW() - INTERVAL '30 days'`);
    for (const f of expiredFiles.rows) {
      if (f.s3_key) await deleteObject(f.s3_key).catch(console.error);
      if (f.thumbnail_key) await deleteObject(f.thumbnail_key).catch(console.error);
      await db.query(`DELETE FROM files WHERE id = $1`, [f.id]);
    }
    await db.query(`DELETE FROM folders WHERE deleted_at < NOW() - INTERVAL '30 days'`);

    // 2. Fetch current trash
    const files = await db.query(`SELECT * FROM files WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
    const folders = await db.query(`SELECT * FROM folders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
    
    res.json({ files: files.rows, folders: folders.rows });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/trash/empty
router.delete('/empty', async (req, res, next) => {
  try {
    const files = await db.query(`SELECT id, s3_key, thumbnail_key FROM files WHERE deleted_at IS NOT NULL`);
    for (const f of files.rows) {
      if (f.s3_key) await deleteObject(f.s3_key).catch(console.error);
      if (f.thumbnail_key) await deleteObject(f.thumbnail_key).catch(console.error);
      await db.query(`DELETE FROM files WHERE id = $1`, [f.id]);
    }
    await db.query(`DELETE FROM folders WHERE deleted_at IS NOT NULL`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/trash/:type/:id
router.delete('/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (type === 'file') {
      const file = await db.query(`SELECT s3_key, thumbnail_key FROM files WHERE id = $1`, [id]);
      if (file.rows.length > 0) {
        if (file.rows[0].s3_key) await deleteObject(file.rows[0].s3_key).catch(console.error);
        if (file.rows[0].thumbnail_key) await deleteObject(file.rows[0].thumbnail_key).catch(console.error);
        await db.query(`DELETE FROM files WHERE id = $1`, [id]);
      }
    } else if (type === 'folder') {
      await db.query(`DELETE FROM folders WHERE id = $1`, [id]);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
