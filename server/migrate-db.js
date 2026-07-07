const db = require('./config/db');

async function migrateDb() {
  try {
    await db.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS thumbnail_key VARCHAR(512);`);
    await db.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;`);
    await db.query(`ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;`);
    console.log('Database migrated: added thumbnail_key and is_starred.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateDb();
