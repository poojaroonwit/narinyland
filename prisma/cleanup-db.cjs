const { Client } = require('pg');

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database for cleanup...');

    // 0. Ensure columns to be dropped exist (so migration doesn't fail on DROP)
    console.log('Ensuring legacy pwa columns exist in AppConfig (so they can be dropped)...');
    const legacyCols = ["pwaBackgroundColor", "pwaDescription", "pwaIconUrl", "pwaName", "pwaShortName", "pwaThemeColor"];
    for (const col of legacyCols) {
      try {
        await client.query(`ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`);
      } catch (e) {
        // ignore
      }
    }

    // 2. Drop conflicting columns from TimelineEvent and Memory
    console.log('Dropping latitude/longitude from TimelineEvent if they exist...');
    await client.query('ALTER TABLE "TimelineEvent" DROP COLUMN IF EXISTS "latitude";');
    await client.query('ALTER TABLE "TimelineEvent" DROP COLUMN IF EXISTS "longitude";');

    console.log('Dropping albumId from Memory if it exists...');
    await client.query('ALTER TABLE "Memory" DROP COLUMN IF EXISTS "albumId";');

    console.log('Dropping showProposal from AppConfig if it exists...');
    await client.query('ALTER TABLE "AppConfig" DROP COLUMN IF EXISTS "showProposal";');

    // 3. Drop conflicting tables in reverse order of foreign keys
    console.log('Dropping PurchasedItem, Land, Album if they exist...');
    await client.query('DROP TABLE IF EXISTS "PurchasedItem" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Land" CASCADE;');
    await client.query('DROP TABLE IF EXISTS "Album" CASCADE;');

    // 4. Reset migration state for the specific failed/drifted migration
    console.log('Resetting migration state for 20260307151302_init in _prisma_migrations...');
    const deleteRes = await client.query('DELETE FROM "_prisma_migrations" WHERE "migration_name" = \'20260307151302_init\';');
    console.log(`Deleted ${deleteRes.rowCount} rows from _prisma_migrations.`);

    // 5. Check migrations state
    const migrations = await client.query('SELECT migration_name, finished_at FROM "_prisma_migrations";');
    console.log('Current migrations in database:', migrations.rows);

    console.log('Cleanup and state reset completed successfully.');
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  } finally {
    await client.end();
  }
}

cleanup();
