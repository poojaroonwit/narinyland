import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { addPoints } from '@/lib/stats-service';

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = await request.json();
    const { amount } = body;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    return NextResponse.json(await addPoints(access.configId, amount));
  } catch (error) {
    console.error('Error adding points:', error);
    return NextResponse.json({ error: 'Failed to add points' }, { status: 500 });
  }
}
