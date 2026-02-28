"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { isAuthenticated, getUser, logout as authLogout, getAccessToken } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  isLoggedIn: boolean;
  user: { sub: string; name: string; email: string; picture: string } | null;
  token: string | null;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  token: null,
  logout: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

// Routes that don't require auth
const PUBLIC_ROUTES = ['/login', '/auth/callback'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [token, setToken] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      setUser(getUser());
      setToken(getAccessToken());
      setLoading(false);

      // Redirect to login if not authenticated and not on a public route
      const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
      if (!authenticated && !isPublicRoute) {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [pathname, router]);

  const handleLogout = () => {
    authLogout();
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
          <p className="text-pink-600 font-outfit text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow public routes to render without auth
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (!isLoggedIn && !isPublicRoute) {
    // Already redirecting in effect, show loading in the meantime
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
          <p className="text-pink-600 font-outfit text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, token, logout: handleLogout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
