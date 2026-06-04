import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create App Config ───────────────────────────────────────────
  await prisma.appConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      appName: 'Our Story',
      anniversaryDate: new Date(),
      treeStyle: 'oak',
      galleryStyle: 'carousel',
      gallerySource: 'manual',
      instagramUsername: '',
      daysPerTree: 100,
      proposalQuestions: ['Will you be my partner forever?'],
    },
  });
  console.log('  ✅ AppConfig created');

  // ─── Create Partners ─────────────────────────────────────────────
  await prisma.partner.upsert({
    where: { configId_partnerId: { configId: 'default', partnerId: 'partner1' } },
    update: {},
    create: {
      partnerId: 'partner1',
      name: 'Partner 1',
      avatar: '❤️',
      configId: 'default',
    },
  });

  await prisma.partner.upsert({
    where: { configId_partnerId: { configId: 'default', partnerId: 'partner2' } },
    update: {},
    create: {
      partnerId: 'partner2',
      name: 'Partner 2',
      avatar: '💖',
      configId: 'default',
    },
  });
  console.log('  ✅ Partners created');

  // ─── Create Memories ─────────────────────────────────────────────
  console.log('  ⏭️  Skipping memories creation');

  // ─── Create Timeline Events ──────────────────────────────────────
  console.log('  ⏭️  Skipping timeline events creation');

  // ─── Create Coupons ──────────────────────────────────────────────
  console.log('  ⏭️  Skipping coupons creation');

  // ─── Create Love Stats ───────────────────────────────────────────
  await prisma.loveStats.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      xp: 0,
      level: 1,
    },
  });
  console.log('  ✅ Love stats initialized');

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
