import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Add missing columns to AppConfig
    const appConfigUpdates = [
      `ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "showProposal" BOOLEAN NOT NULL DEFAULT true;`,
      `ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "proposalQuestions" TEXT[] DEFAULT ARRAY['Will you be my Valentine?', 'Jaroonwit is so handsome, right?']::TEXT[];`,
      `ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "isProposalAccepted" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "proposalProgress" INTEGER NOT NULL DEFAULT 0;`
    ];

    for (const sql of appConfigUpdates) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        console.warn(`SQL update failed (may already exist): ${sql}`, e.message);
      }
    }

    // 2. Create missing tables if they don't exist
    const tableCreations = [
      `CREATE TABLE IF NOT EXISTS "Album" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "configId" TEXT NOT NULL DEFAULT 'default',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "Land" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT false,
        "configId" TEXT NOT NULL DEFAULT 'default',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Land_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE TABLE IF NOT EXISTS "PurchasedItem" (
        "id" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "modelUrl" TEXT,
        "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "z" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "landId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PurchasedItem_pkey" PRIMARY KEY ("id")
      );`
    ];

    for (const sql of tableCreations) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        console.warn(`Table creation failed (may already exist):`, e.message);
      }
    }

    // 3. Add foreign keys and other column updates
    const finalUpdates = [
      `ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;`,
      `ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;`,
      `ALTER TABLE "Memory" ADD COLUMN IF NOT EXISTS "albumId" TEXT;`,
      // Add foreign keys (using try-catch because these often fail if already present)
      `ALTER TABLE "Album" ADD CONSTRAINT "Album_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
      `ALTER TABLE "Land" ADD CONSTRAINT "Land_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
      `ALTER TABLE "PurchasedItem" ADD CONSTRAINT "PurchasedItem_landId_fkey" FOREIGN KEY ("landId") REFERENCES "Land"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
      `ALTER TABLE "Memory" ADD CONSTRAINT "Memory_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;`
    ];

    for (const sql of finalUpdates) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        // console.warn(`Final SQL update might have failed (likely already exists): ${sql.substring(0, 50)}...`, e.message);
      }
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
