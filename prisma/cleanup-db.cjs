const { Client } = require('pg');

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database for cleanup...');

    // 1. Drop conflicting columns from TimelineEvent
    console.log('Dropping latitude/longitude from TimelineEvent if they exist...');
    await client.query('ALTER TABLE "TimelineEvent" DROP COLUMN IF EXISTS "latitude";');
    await client.query('ALTER TABLE "TimelineEvent" DROP COLUMN IF EXISTS "longitude";');

    // 2. Drop conflicting column from Memory
    console.log('Dropping albumId from Memory if it exists...');
    await client.query('ALTER TABLE "Memory" DROP COLUMN IF EXISTS "albumId";');

    // 3. Drop conflicting tables in reverse order of foreign keys
    console.log('Dropping PurchasedItem, Land, Album if they exist...');
    await client.query('DROP TABLE IF EXISTS "PurchasedItem" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Land" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Album" CASCADE;');

    console.log('Cleanup completed successfully.');
  } catch (err) {
    console.error('Error during cleanup:', err.message);
    // Don't fail the build if cleanup fails (might be permission issues or something else)
  } finally {
    await client.end();
  }
}

cleanup();
