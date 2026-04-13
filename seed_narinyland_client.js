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
    
    const clientId = '132bb02d-212b-43dc-b74c-79a42f4dbffa';
    const applicationId = '421eaadd-cf80-443d-b220-61d28d52a79d';
    const hash = '$2b$12$2GY7fMzOSVuUvPVc9QER4.AI.8azr2eN7K3aGWjR/RzoxmpQhxGuW';
    const last4 = 'af8f';
    const redirectUris = JSON.stringify([
      "https://narinyland.up.railway.app/auth/callback",
      "http://localhost:3000/auth/callback",
      "https://appkits.up.railway.app/auth/callback"
    ]);

    const res = await client.query(
      `INSERT INTO oauth_clients 
      (id, client_id, client_secret_hash, client_secret_last4, name, application_id, client_type, redirect_uris, is_active, require_pkce, created_at, updated_at) 
      VALUES (gen_random_uuid(), $1, $2, $3, 'Narinyland', $4, 'confidential', $5, true, true, now(), now())
      ON CONFLICT (client_id) DO UPDATE SET 
        client_secret_hash = EXCLUDED.client_secret_hash,
        client_secret_last4 = EXCLUDED.client_secret_last4,
        redirect_uris = EXCLUDED.redirect_uris,
        updated_at = now()
      RETURNING id`,
      [clientId, hash, last4, applicationId, redirectUris]
    );

    console.log('Successfully created/updated OAuth client in AppKit DB:', res.rows[0].id);
  } catch (err) {
    console.error('Database execution error:', err);
  } finally {
    await client.end();
  }
}

main();
