import pg from 'pg';
const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:oBkuhmFKwBCrUJTzTCSnrOiDnpArhtIN@interchange.proxy.rlwy.net:56678/railway",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to AppKit DB');
    
    const apps = await client.query("SELECT id, name, slug FROM applications");
    console.log('--- APPLICATIONS ---');
    console.table(apps.rows);
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

main();
