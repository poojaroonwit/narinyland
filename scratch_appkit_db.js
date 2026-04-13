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
    
    // List all applications
    const apps = await client.query("SELECT id, name, slug FROM applications");
    console.log('--- APPLICATIONS ---');
    console.table(apps.rows);

    // Find the specific client
    const res = await client.query("SELECT * FROM oauth_clients WHERE client_id = '132bb02d-212b-43dc-b74c-79a42f4dbffa'");
    console.log('--- TARGET CLIENT ---');
    if (res.rows.length > 0) {
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('Client not found. Listing all clients:');
      const allClients = await client.query("SELECT client_id, name FROM oauth_clients");
      console.table(allClients.rows);
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

main();
