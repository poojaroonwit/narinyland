import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security on all tables...\n');

  const tables = [
    'AppConfig',
    'Partner',
    'Memory',
    'TimelineEvent',
    'LoveLetter',
    'Coupon',
    'LoveStats',
    'Album',
    'Land',
    'PurchasedItem',
  ];

  for (const table of tables) {
    try {
      // Enable RLS
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  ✅ RLS enabled on "${table}"`);
    } catch (error: any) {
      console.error(`  ❌ Failed to enable RLS on "${table}":`, error.message);
    }

    try {
      // Revoke access from anon and authenticated roles
      await prisma.$executeRawUnsafe(`REVOKE ALL ON "${table}" FROM anon, authenticated;`);
      console.log(`  🚫 Revoked anon/authenticated access on "${table}"`);
    } catch (error: any) {
      // Roles might not exist if not on Supabase standard setup
      console.warn(`  ⚠️  Could not revoke on "${table}" (roles may not exist):`, error.message);
    }
  }

  console.log('\n🎉 RLS setup complete! Tables are now protected from Data API access.');
  console.log('   Prisma (postgres superuser) will continue to work normally.');
}

enableRLS()
  .catch((e) => {
    console.error('❌ RLS setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
