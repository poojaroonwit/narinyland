import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkInvalidUrls() {
  try {
    const memories = await prisma.memory.findMany({
      where: {
        NOT: {
          url: {
            startsWith: '/api/'
          }
        }
      }
    });
    console.log(`Found ${memories.length} memories with invalid URLs.`);
    memories.forEach(m => console.log(` - ID: ${m.id}, URL: ${m.url}`));

    const timelineEvents = await prisma.timelineEvent.findMany({
      where: {
        OR: [
          { mediaUrl: { not: null, not: { startsWith: '/api/' } } },
          { mediaUrls: { has: '' } } // This might not be the best check for arrays
        ]
      }
    });
    // For arrays we have to check manually or use a more complex query
    const allTimelineEvents = await prisma.timelineEvent.findMany();
    const badTimelineEvents = allTimelineEvents.filter(te => {
      if (te.mediaUrl && !te.mediaUrl.startsWith('/api/') && !te.mediaUrl.startsWith('http')) return true;
      if (te.mediaUrls.some(u => u && !u.startsWith('/api/') && !u.startsWith('http'))) return true;
      return false;
    });
    
    console.log(`Found ${badTimelineEvents.length} timeline events with potentially invalid URLs.`);
    badTimelineEvents.forEach(te => console.log(` - ID: ${te.id}, mediaUrl: ${te.mediaUrl}, mediaUrls: ${te.mediaUrls}`));

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvalidUrls();
