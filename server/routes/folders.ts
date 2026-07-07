import express from 'express';
const router = express.Router();
import db from '../config/db';

// POST /api/folders
router.post('/', async (req, res, next) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name required' });
    
    const result = await db.query(
      `INSERT INTO folders (name, parent_id) VALUES ($1, $2) RETURNING *`,
      [name, parent_id || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/folders/all
router.get('/all', async (req, res, next) => {
  try {
    const result = await db.query(`SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name ASC`);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/folders/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query(`UPDATE folders SET deleted_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/folders/:id/restore
router.put('/:id/restore', async (req, res, next) => {
  try {
    await db.query(`UPDATE folders SET deleted_at = NULL WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/folders/:id/rename
router.put('/:id/rename', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    await db.query(`UPDATE folders SET name = $1 WHERE id = $2`, [name, id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/folders/:id/star
router.put('/:id/star', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_starred } = req.body;
    
    await db.query(`UPDATE folders SET is_starred = $1 WHERE id = $2`, [!!is_starred, id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
