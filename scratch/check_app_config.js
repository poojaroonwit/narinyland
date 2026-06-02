import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAppConfig() {
  try {
    const config = await prisma.appConfig.findFirst({
      where: { id: 'default' }
    });
    console.log('AppConfig:', JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error checking AppConfig:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppConfig();
