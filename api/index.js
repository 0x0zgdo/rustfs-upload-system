const express = require('express');
const cors = require('cors');
const db = require('./db');
const { ensureBucket, generateUploadUrl, generateDownloadUrl } = require('./s3');
const { connectRedis } = require('./redis');
const { addThumbnailJob } = require('./queue');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/upload-url', async (req, res) => {
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
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/metadata', async (req, res) => {
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
    console.error('Error saving metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/files', async (req, res) => {
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
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/download-url/:id', async (req, res) => {
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
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/preview-url/:id', async (req, res) => {
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
    console.error('Error generating preview URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/folders', async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name required' });
    
    const result = await db.query(
      `INSERT INTO folders (name, parent_id) VALUES ($1, $2) RETURNING *`,
      [name, parent_id || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/folders/all', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/content', async (req, res) => {
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
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/files/:id/move', async (req, res) => {
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
    console.error('Error moving file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- TRASH & RECOVERY ---

app.get('/trash', async (req, res) => {
  try {
    // 1. Lazy Cleanup: Permanently delete anything in trash > 30 days
    const expiredFiles = await db.query(`SELECT id, s3_key, thumbnail_key FROM files WHERE deleted_at < NOW() - INTERVAL '30 days'`);
    for (const f of expiredFiles.rows) {
      if (f.s3_key) await require('./s3').deleteObject(f.s3_key).catch(console.error);
      if (f.thumbnail_key) await require('./s3').deleteObject(f.thumbnail_key).catch(console.error);
      await db.query(`DELETE FROM files WHERE id = $1`, [f.id]);
    }
    await db.query(`DELETE FROM folders WHERE deleted_at < NOW() - INTERVAL '30 days'`);

    // 2. Fetch current trash
    const files = await db.query(`SELECT * FROM files WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
    const folders = await db.query(`SELECT * FROM folders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`);
    
    res.json({ files: files.rows, folders: folders.rows });
  } catch (error) {
    console.error('Error fetching trash:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/files/:id', async (req, res) => {
  try {
    await db.query(`UPDATE files SET deleted_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/starred', async (req, res) => {
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
    console.error('Error fetching starred:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/folders/:id', async (req, res) => {
  try {
    await db.query(`UPDATE folders SET deleted_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/files/:id/restore', async (req, res) => {
  try {
    await db.query(`UPDATE files SET deleted_at = NULL WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/folders/:id/restore', async (req, res) => {
  try {
    await db.query(`UPDATE folders SET deleted_at = NULL WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.delete('/trash/empty', async (req, res) => {
  try {
    const files = await db.query(`SELECT id, s3_key, thumbnail_key FROM files WHERE deleted_at IS NOT NULL`);
    for (const f of files.rows) {
      if (f.s3_key) await require('./s3').deleteObject(f.s3_key).catch(console.error);
      if (f.thumbnail_key) await require('./s3').deleteObject(f.thumbnail_key).catch(console.error);
      await db.query(`DELETE FROM files WHERE id = $1`, [f.id]);
    }
    await db.query(`DELETE FROM folders WHERE deleted_at IS NOT NULL`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error emptying trash:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/trash/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (type === 'file') {
      const file = await db.query(`SELECT s3_key, thumbnail_key FROM files WHERE id = $1`, [id]);
      if (file.rows.length > 0) {
        if (file.rows[0].s3_key) await require('./s3').deleteObject(file.rows[0].s3_key).catch(console.error);
        if (file.rows[0].thumbnail_key) await require('./s3').deleteObject(file.rows[0].thumbnail_key).catch(console.error);
        await db.query(`DELETE FROM files WHERE id = $1`, [id]);
      }
    } else if (type === 'folder') {
      await db.query(`DELETE FROM folders WHERE id = $1`, [id]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error permanent delete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/:type/:id/rename', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    if (type === 'file' || type === 'files') {
      await db.query(`UPDATE files SET filename = $1 WHERE id = $2`, [name, id]);
    } else if (type === 'folder' || type === 'folders') {
      await db.query(`UPDATE folders SET name = $1 WHERE id = $2`, [name, id]);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error renaming:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/:type/:id/star', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { is_starred } = req.body;
    
    if (type === 'file' || type === 'files') {
      await db.query(`UPDATE files SET is_starred = $1 WHERE id = $2`, [!!is_starred, id]);
    } else if (type === 'folder' || type === 'folders') {
      await db.query(`UPDATE folders SET is_starred = $1 WHERE id = $2`, [!!is_starred, id]);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling star:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectRedis();
  await ensureBucket();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
