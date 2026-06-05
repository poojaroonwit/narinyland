import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { addXP } from '@/lib/stats-service';

export async function PUT(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = await request.json();
    const { amount, partnerId } = body;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    return NextResponse.json(await addXP(access.configId, amount, partnerId || 'partner1'));
  } catch (error) {
    console.error('Error adding XP:', error);
    return NextResponse.json({ error: 'Failed to add XP' }, { status: 500 });
  }
}
