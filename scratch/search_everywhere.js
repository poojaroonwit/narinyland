import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function searchEverywhere() {
  const target = '4242a359-f15b-4987-91ca-1766bf5f04a4';
  console.log(`Searching for ${target} in all tables...`);
  
  try {
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    
    for (const model of models) {
      const records = await (prisma[model] as any).findMany();
      const stringified = JSON.stringify(records);
      if (stringified.includes(target)) {
        console.log(`Found match in model: ${model}`);
        const match = records.find((r: any) => JSON.stringify(r).includes(target));
        console.log('Record:', JSON.stringify(match, null, 2));
      }
    }
    console.log('Search complete.');
  } catch (error) {
    console.error('Error searching:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchEverywhere();
