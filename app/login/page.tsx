"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import BlurText from "@/components/BlurText";
import Logo from "@/components/Logo";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_115329_5e00c9c5-4d69-49b7-94c3-9c31c60bb644.mp4";

// Inline SVG icons
function ArrowUpRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function LoaderIcon({ className = "" }: { className?: string }) {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
];

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading, checkAuth } = useAuth();
  const [firstname, setFirstname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.replace("/");
    }
  }, [router, isLoggedIn, authLoading]);

  const handleNameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstname.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/name-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstname: firstname.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        if (checkAuth) await checkAuth();
        router.refresh();
        router.push("/");
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    router.push("/#" + id);
  };

  const handleAppKitLogin = async () => {
    await login();
  };

  return (
    <div className="w-full min-h-screen bg-pink-50 relative overflow-hidden flex items-center justify-center p-6">
      {/* Background Video (Same as Hero) */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/images/hero_bg.jpeg"
        src={VIDEO_URL}
      />
      <div className="absolute inset-0 bg-black/40 z-[1] backdrop-blur-sm" />

      {/* ── Navbar (Minimal) ── */}
      <nav className="fixed top-4 left-0 right-0 z-[100] px-6 lg:px-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center -ml-2 cursor-pointer" onClick={() => router.push("/")}>
            <Logo size={80} title="Narinyland" />
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest font-body hover:bg-white/20 transition-all"
          >
            Back to Home
          </button>
        </div>
      </nav>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md liquid-glass-strong p-10 rounded-[3rem] flex flex-col items-center shadow-2xl"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-2xl">
            🌸
          </div>
          <h2 className="text-3xl font-heading italic text-white mb-2">Welcome Back</h2>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Enter your name to unlock the garden</p>
        </div>

        <form onSubmit={handleNameLogin} className="w-full space-y-6">
          <div className="space-y-1">
            <div className="relative group">
              <input
                type="text"
                value={firstname}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstname(e.target.value)}
                placeholder="Your Firstname"
                className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-center text-xl font-bold font-body"
                required
                autoFocus
              />
            </div>
            {error && (
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="text-pink-400 text-[10px] text-center font-black mt-3 uppercase tracking-[0.2em]"
              >
                {error}
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black rounded-[1.5rem] py-5 font-black text-sm tracking-[0.3em] uppercase hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center relative shadow-xl active:scale-95"
          >
            <span className={loading ? "opacity-0" : "opacity-100"}>Unlock Garden</span>
            {loading && <LoaderIcon className="w-6 h-6 absolute inset-0 m-auto text-black" />}
          </button>
        </form>

        <div className="mt-12 pt-10 border-t border-white/5 w-full flex flex-col items-center gap-6">
          <button
            onClick={handleAppKitLogin}
            className="text-white/20 hover:text-white/50 text-[10px] uppercase tracking-[0.3em] font-black transition-colors"
          >
            Admin / Social Login
          </button>
        </div>
      </motion.div>

      <style jsx global>{`
        .font-heading {
          font-family: 'Pacifico', cursive;
        }
        .font-body {
          font-family: 'Outfit', sans-serif;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
