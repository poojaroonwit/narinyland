import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/migrate
 * One-shot migration endpoint — adds the Partner.userId column if missing.
 * DELETE THIS FILE after running once.
 */
export async function GET() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "userId" TEXT;`
    );
    return NextResponse.json({ ok: true, message: 'Migration applied: Partner.userId column added.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
