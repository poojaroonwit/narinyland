import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:oBkuhmFKwBCrUJTzTCSnrOiDnpArhtIN@interchange.proxy.rlwy.net:56678/railway",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    // Find the OAuth client by name or ID
    const res = await client.query("SELECT * FROM oauth_clients WHERE client_id = '132bb02d-212b-43dc-b74c-79a42f4dbffa'");
    console.log('--- CLIENT INFO ---');
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

main();
