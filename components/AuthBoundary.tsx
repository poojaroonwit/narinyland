"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import AuthProvider from '@/components/AuthProvider';

const LOCAL_AUTH_ROUTES = ['/login', '/signup', '/auth/social-complete'];

export default function AuthBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLocalAuthPage = LOCAL_AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));

  if (isLocalAuthPage) return <>{children}</>;
  return <AuthProvider>{children}</AuthProvider>;
}
