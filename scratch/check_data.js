import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
  try {
    const memory = await prisma.memory.findFirst();
    console.log('Sample Memory:', JSON.stringify(memory, null, 2));
    
    const timelineEvent = await prisma.timelineEvent.findFirst();
    console.log('Sample TimelineEvent:', JSON.stringify(timelineEvent, null, 2));
    
    // Check PurchasedItems too as they are in the list of models
    const purchasedItem = await prisma.purchasedItem.findFirst();
    console.log('Sample PurchasedItem:', JSON.stringify(purchasedItem, null, 2));

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
