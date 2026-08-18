import { NextResponse } from 'next/server';
import { isConfigAccessDenied, requireConfigAccess } from '@/lib/config-access';
import { applyFamilyFarmAction, getFamilyFarmSave } from '@/lib/family-farm-store';
import { CROP_KEYS, type CropKey, type FarmAction } from '@/lib/family-farm-game';

function readLandId(request: Request, body?: unknown): string | null {
  if (body && typeof body === 'object' && 'landId' in body) {
    const candidate = (body as { landId?: unknown }).landId;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  try {
    const candidate = new URL(request.url).searchParams.get('landId')?.trim();
    return candidate || null;
  } catch {
    return null;
  }
}

function isCropKey(value: unknown): value is CropKey {
  return typeof value === 'string' && CROP_KEYS.includes(value as CropKey);
}

function parseFarmAction(value: unknown): FarmAction | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as Record<string, unknown>;

  switch (action.type) {
    case 'plant':
      return typeof action.plotId === 'string' && isCropKey(action.cropKey)
        ? { type: 'plant', plotId: action.plotId, cropKey: action.cropKey }
        : null;
    case 'water':
      return typeof action.plotId === 'string'
        ? { type: 'water', plotId: action.plotId }
        : null;
    case 'harvest':
      return typeof action.plotId === 'string'
        ? { type: 'harvest', plotId: action.plotId }
        : null;
    case 'buy_seed':
      return isCropKey(action.cropKey) && (action.quantity === undefined || typeof action.quantity === 'number')
        ? { type: 'buy_seed', cropKey: action.cropKey, quantity: action.quantity as number | undefined }
        : null;
    case 'sell':
      return isCropKey(action.cropKey) && (
        action.quantity === undefined || action.quantity === 'all' || typeof action.quantity === 'number'
      )
        ? { type: 'sell', cropKey: action.cropKey, quantity: action.quantity as number | 'all' | undefined }
        : null;
    case 'end_day':
      return { type: 'end_day' };
    case 'upgrade_home':
      return { type: 'upgrade_home' };
    case 'rename_family':
      return typeof action.name === 'string'
        ? { type: 'rename_family', name: action.name }
        : null;
    default:
      return null;
  }
}

export async function GET(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const landId = readLandId(request);
    if (!landId) {
      return NextResponse.json({ error: 'landId is required' }, { status: 400 });
    }

    return NextResponse.json(await getFamilyFarmSave(access.configId, landId));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load family farm';
    const status = message.includes('not found') ? 404 : 500;
    console.error('Error fetching family farm:', error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireConfigAccess(request);
    if (isConfigAccessDenied(access)) return access.response;

    const body = await request.json().catch(() => null);
    const landId = readLandId(request, body);
    const action = body && typeof body === 'object' && 'action' in body
      ? parseFarmAction((body as { action?: unknown }).action)
      : null;

    if (!landId) {
      return NextResponse.json({ error: 'landId is required' }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ error: 'A valid farm action is required' }, { status: 400 });
    }

    return NextResponse.json(await applyFamilyFarmAction(access.configId, landId, action));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update family farm';
    const isGameRuleError = [
      'not enough',
      'out of energy',
      'already',
      'nothing to harvest',
      'needs more',
      'do not have',
      'plant something',
      'fully upgraded',
      'does not exist',
    ].some((fragment) => message.toLowerCase().includes(fragment));
    const status = message.includes('not found') ? 404 : isGameRuleError ? 409 : 500;
    console.error('Error applying family farm action:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
