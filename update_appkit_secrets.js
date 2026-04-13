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
    
    const allClients = await client.query("SELECT id, client_id, name FROM oauth_clients");
    console.log('--- ALL CLIENTS ---');
    console.table(allClients.rows);

    const clientId = '132bb02d-212b-43dc-b74c-79a42f4dbffa';
    const hash = '$2b$12$2GY7fMzOSVuUvPVc9QER4.AI.8azr2eN7K3aGWjR/RzoxmpQhxGuW';
    const last4 = 'af8f';

    const res = await client.query(
      "UPDATE oauth_clients SET client_secret_hash = $1, client_secret_last4 = $2 WHERE client_id = $3 RETURNING id",
      [hash, last4, clientId]
    );

    if (res.rows.length > 0) {
      console.log('Successfully updated AppKit client secret for client:', clientId);
    } else {
      console.error('FAILED: Client ID not found in database:', clientId);
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

main();
