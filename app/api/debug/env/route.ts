import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/security';

export async function GET(request: Request) {
  const adminRejection = requireAdminRequest(request);
  if (adminRejection) return adminRejection;

  const secret = process.env.APPKIT_CLIENT_SECRET || '';
  const clientId = process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || process.env.APPKIT_CLIENT_ID || '';
  const domain = process.env.NEXT_PUBLIC_APPKIT_DOMAIN || process.env.APPKIT_DOMAIN || '';
  
  return NextResponse.json({
    env: {
      APPKIT_CLIENT_ID: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
      APPKIT_DOMAIN_SET: !!domain,
      APPKIT_CLIENT_SECRET_SET: !!secret,
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}
