"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { isAuthenticated, getUser, logout as authLogout, getAccessToken, initAppKit, getUserCircles } from '@/lib/auth';
import { setActiveCircleId } from '@/lib/circle-store';
import { usePathname, useRouter } from 'next/navigation';

type Circle = { id: string; name: string; description?: string; role: string; memberCount?: number; createdAt?: string };

interface AuthContextType {
  isLoggedIn: boolean;
  user: { sub: string; name: string; email: string; picture: string; attributes: Record<string, any> } | null;
  token: string | null;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
  circles: Circle[];
  activeCircleId: string | null;
  setActiveCircle: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  token: null,
  logout: () => {},
  refreshUser: async () => {},
  loading: true,
  circles: [],
  activeCircleId: null,
  setActiveCircle: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Routes that don't require auth
const PUBLIC_ROUTES = ['/login', '/auth/callback', '/onboarding'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [token, setToken] = useState<string | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircleId, setActiveCircleIdState] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const checkAuth = async () => {
    try {
      await initAppKit();
    } catch (err) {
      console.error('Failed to initialize AppKit:', err);
    }

    const authenticated = isAuthenticated();
    setIsLoggedIn(authenticated);

    if (authenticated) {
      const userInfo = await getUser();

      // Token expired/invalid — getUser() returns null even though isAuthenticated() = true.
      // Treat as logged out to prevent an infinite redirect loop to /onboarding.
      if (!userInfo) {
        setIsLoggedIn(false);
        setUser(null);
        setCircles([]);
        setActiveCircleIdState(null);
        setActiveCircleId(null);
        setToken(null);
        setLoading(false);
        const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
        if (!isPublicRoute) router.replace('/login');
        return;
      }

      setUser(userInfo);

      // Fetch circles and determine active circle
      const userCircles = await getUserCircles();
      setCircles(userCircles);

      // Use the explicitly stored circle ID (from user attributes or localStorage).
      // If none is stored, default to null so backend falls back to 'default' config —
      // preserving existing data for users who haven't set up a circle yet.
      const savedCircleId = userInfo.attributes?.circleId as string | undefined;
      const storedCircleId = typeof window !== 'undefined' ? localStorage.getItem('narinyland_circle_id') : null;
      const resolvedCircleId = savedCircleId || storedCircleId || null;
      setActiveCircleIdState(resolvedCircleId);
      setActiveCircleId(resolvedCircleId);

      // Redirect to onboarding if user has no circles
      if (userCircles.length === 0 && !pathname.startsWith('/onboarding')) {
        router.replace('/onboarding');
        setLoading(false);
        return;
      }
    } else {
      setUser(null);
      setCircles([]);
      setActiveCircleIdState(null);
    }

    setToken(getAccessToken());
    setLoading(false);

    // Redirect to login if not authenticated and not on a public route
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    if (!authenticated && !isPublicRoute) {
      router.replace('/login');
    }
  };

  const setActiveCircle = async (id: string) => {
    setActiveCircleIdState(id);
    setActiveCircleId(id);
    try {
      const { getAppKit } = await import('@/lib/auth');
      await getAppKit().updateAttributes({ circleId: id });
    } catch (err) {
      console.error('Failed to persist active circle:', err);
    }
  };

  // Run once on mount. Route-guard redirects happen inside checkAuth itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    checkAuth();
  }, []);

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
    <AuthContext.Provider value={{ isLoggedIn, user, token, logout: handleLogout, refreshUser: checkAuth, loading, circles, activeCircleId, setActiveCircle }}>
      {children}
    </AuthContext.Provider>
  );
}
