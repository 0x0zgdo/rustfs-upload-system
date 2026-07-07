import db from './config/db';

async function migrateDb() {
  try {
    console.log('Starting migration...');
    
    // Wipe current data to safely add NOT NULL constraint
    try {
      await db.query(`TRUNCATE TABLE files, folders CASCADE;`);
    } catch (e) {
      console.log('Tables might not exist yet, skipping truncate.');
    }

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await db.query(`ALTER TABLE folders ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;`);
    } catch (e) {
      console.log('user_id might already exist in folders');
    }
    
    try {
      await db.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;`);
    } catch (e) {
      console.log('user_id might already exist in files');
    }

    await db.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS thumbnail_key VARCHAR(512);`);
    await db.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;`);
    await db.query(`ALTER TABLE folders ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;`);
    console.log('Database migrated: added user_id, users table, thumbnail_key, and is_starred.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateDb();
