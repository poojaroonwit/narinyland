import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Add the missing showProposal column
    await prisma.$executeRawUnsafe(`ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "showProposal" BOOLEAN NOT NULL DEFAULT true;`);
    
    // 2. Add other missing columns/tables if they are missing
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "proposalQuestions" TEXT[] DEFAULT ARRAY['Will you be my Valentine?', 'Jaroonwit is so handsome, right?']::TEXT[];`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "isProposalAccepted" BOOLEAN NOT NULL DEFAULT false;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "proposalProgress" INTEGER NOT NULL DEFAULT 0;`);
      
      // Add missing latitude/longitude to TimelineEvent
      await prisma.$executeRawUnsafe(`ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;`);
    } catch (e: any) {
      console.warn('Optional columns update failed (may already exist):', e.message);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database schema updated successfully. You can now delete this file.' 
    });
  } catch (error: any) {
    console.error('Database fix failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
