const db = require('./config/db');

async function initDb() {
  const createFoldersTable = `
    CREATE TABLE IF NOT EXISTS folders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createFilesTable = `
    CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename VARCHAR(255) NOT NULL,
      s3_key VARCHAR(512) NOT NULL UNIQUE,
      size BIGINT NOT NULL,
      mimetype VARCHAR(128) NOT NULL,
      thumbnail_key VARCHAR(512),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const alterFilesTable = `
    ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
  `;

  const addDeletedAtFolders = `
    ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  `;

  const addDeletedAtFiles = `
    ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  `;

  try {
    await db.query(createFoldersTable);
    await db.query(createFilesTable);
    await db.query(alterFilesTable);
    await db.query(addDeletedAtFolders);
    await db.query(addDeletedAtFiles);
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    process.exit(0);
  }
}

initDb();
