"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { isAuthenticated, getUser, logout as authLogout, initAppKit, getUserCircles, AuthRequiredError } from '@/lib/auth';
import { setActiveCircleId } from '@/lib/circle-store';
import { usePathname, useRouter } from 'next/navigation';

type Circle = { id: string; name: string; description?: string; role: string; memberCount?: number; createdAt?: string };

interface AuthContextType {
  isLoggedIn: boolean;
  user: { sub: string; name: string; email: string; picture: string; attributes: Record<string, unknown> } | null;
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
const PUBLIC_ROUTES = ['/', '/auth/callback'];
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [token, setToken] = useState<string | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircleId, setActiveCircleIdState] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    authLogout();
  }, []);

  const checkAuth = useCallback(async () => {
    // Prevent concurrent runs (e.g. rapid route changes)
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      await initAppKit();
    } catch (err) {
      console.error('Failed to initialize AppKit:', err);
    }

    const authenticated = isAuthenticated();
    setIsLoggedIn(authenticated);

    // While the callback page is processing the OAuth exchange, skip all
    // redirect logic — let the callback page finish and navigate.
    if (pathname.startsWith('/auth/callback')) {
      setLoading(false);
      checkingRef.current = false;
      return;
    }

    if (authenticated) {
      const userInfo = await getUser();

      // Token expired/invalid — getUser() returns null even though isAuthenticated() = true.
      // Treat as logged out to prevent an infinite redirect loop.
      if (!userInfo) {
        console.warn('AuthProvider: getUser() returned null despite isAuthenticated()=true. Clearing stale tokens.');
        setIsLoggedIn(false);
        setUser(null);
        setCircles([]);
        setActiveCircleIdState(null);
        setActiveCircleId(null);
        setToken(null);
        
        // --- CRITICAL FIX ---
        // Clear tokens directly from localStorage instead of calling authLogout().
        // authLogout() triggers a full OAuth logout redirect to the AppKit server,
        // which then redirects the browser back to /login via post_logout_redirect_uri.
        // This causes the user to see "redirect back to /login after signin".
        // By only clearing the local state, we avoid the redirect chain.
        if (typeof window !== 'undefined') {
          try {
            // Clear all AppKit-related tokens from localStorage
            const keysToRemove = Object.keys(localStorage).filter(k => 
              k.startsWith('appkit') || k.includes('appkit') || k.includes('token')
            );
            keysToRemove.forEach(k => localStorage.removeItem(k));
            console.warn('AuthProvider: Cleared stale tokens from localStorage:', keysToRemove);
            
            // --- LOOP BREAKER ---
            // Explicitly clear the metadata cookie to stop the loop
            document.cookie = 'narinyland_is_auth=; Max-Age=0; path=/;';
          } catch (e) {
            console.error('Failed to clear localStorage tokens:', e);
          }
        }
        
        setLoading(false);
        checkingRef.current = false;
        
        const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
        if (!isPublicRoute) router.replace('/');
        return;
      }


      setUser(userInfo);

      // Fetch circles and determine active circle
      let userCircles: Circle[] = [];
      try {
        userCircles = await getUserCircles();
        setCircles(userCircles);
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          console.warn('AuthProvider: getUserCircles returned auth error, session likely expired.');
          // Clear auth state and redirect to login
          setIsLoggedIn(false);
          setUser(null);
          if (typeof window !== 'undefined') {
            // Clear cookies to stop loop
            document.cookie = 'narinyland_is_auth=; Max-Age=0; path=/;';
            // Clear localStorage tokens
            Object.keys(localStorage).filter(k => k.includes('appkit') || k.includes('token')).forEach(k => localStorage.removeItem(k));
          }
          router.replace('/');
          setLoading(false);
          checkingRef.current = false;
          return;
        }
        // Non-auth errors: treat as no circles
        setCircles([]);
      }

      // Use the explicitly stored circle ID, falling back to first available circle
      const savedCircleId = userInfo.attributes?.circleId as string | undefined;
      const storedCircleId = typeof window !== 'undefined' ? localStorage.getItem('narinyland_circle_id') : null;
      let resolvedCircleId = savedCircleId || storedCircleId || null;

      // If no circle stored yet but user already has circles, auto-pick the first one
      if (!resolvedCircleId && userCircles.length > 0) {
        resolvedCircleId = userCircles[0].id;
        // Persist to localStorage and AppKit attributes so subsequent loads are instant
        setActiveCircleId(resolvedCircleId);
        try {
          const { getAppKit } = await import('@/lib/auth');
          await getAppKit().updateAttributes({ circleId: resolvedCircleId });
        } catch (err) {
          console.error('Failed to persist circle to attributes:', err);
        }
      }

      setActiveCircleIdState(resolvedCircleId);
      setActiveCircleId(resolvedCircleId);

      // --- REDIRECTION LOGIC ---
      const isOnboarding = pathname.startsWith('/onboarding');
      const isRoot = pathname === '/';

      if (userCircles.length === 0) {
        // No circles -> must onboard to create or join a world
        if (!isOnboarding) {
          router.replace('/onboarding');
          setLoading(false);
          checkingRef.current = false;
          return;
        }
      } else {
        // Has circles (already has a world) -> go straight to garden, skip onboarding
        if (isRoot || isOnboarding) {
          router.replace('/garden');
          setLoading(false);
          checkingRef.current = false;
          return;
        }
      }
    } else {
      setUser(null);
      setCircles([]);
      setActiveCircleIdState(null);
    }

    setToken(null);
    setLoading(false);
    checkingRef.current = false;

    // Redirect to marketing root if not authenticated and not on a public route
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    if (!authenticated && !isPublicRoute) {
      router.replace('/');
    }
  }, [pathname, router]);

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

  // Idle timeout logic: automatically logout after 1 hour of inactivity
  useEffect(() => {
    if (!isLoggedIn || pathname.startsWith('/auth/callback')) return;

    const TIMEOUT_MS = 3600 * 1000; // 1 hour
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn('Session timed out due to inactivity');
        handleLogout();
      }, TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); // Initialize timer

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isLoggedIn, pathname, handleLogout]);

  // Re-run auth check when pathname changes (e.g. after callback navigates to /).
  // This ensures the auth state is always up-to-date on client-side route changes.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
