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
function ArrowRightIcon({ className = "" }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
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

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading, checkAuth } = useAuth();
  const [firstname, setFirstname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

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
        // Force refresh auth state
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

  const handleAppKitLogin = async () => {
    await login();
  };

  return (
    <div className="relative w-full min-h-screen bg-[hsl(213,45%,67%)] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 scale-105"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src={VIDEO_URL}
      />
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] bg-pink-300/20 rounded-full blur-[120px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-1/4 -right-1/4 w-[60%] h-[60%] bg-blue-300/20 rounded-full blur-[120px]"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <Logo size={120} title="" />
        </motion.div>

        {/* Welcome Text */}
        {!showForm ? (
          <div className="text-center mb-10">
            <BlurText
              text="Welcome Home"
              className="text-5xl md:text-6xl font-heading italic text-white tracking-tight mb-2"
              delay={50}
              animateBy="words"
              direction="bottom"
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-white/70 font-body text-sm tracking-wide uppercase"
            >
              Your digital love garden awaits
            </motion.p>
            
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              onClick={() => setShowForm(true)}
              className="mt-12 liquid-glass-strong group relative px-8 py-4 rounded-full text-white font-medium flex items-center gap-3 hover:scale-105 transition-all duration-300"
            >
              <span>Enter Garden</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="login-form"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full liquid-glass-strong p-8 rounded-[2.5rem] flex flex-col items-center shadow-2xl"
            >
              <div className="mb-6 flex flex-col items-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <HeartIcon className="w-6 h-6 text-pink-400" />
                </div>
                <h2 className="text-2xl font-heading italic text-white">Who are you?</h2>
                <p className="text-white/50 text-xs font-body mt-1">Enter your name to unlock the garden</p>
              </div>

              <form onSubmit={handleNameLogin} className="w-full space-y-4">
                <div className="space-y-1">
                  <div className="relative group">
                    <input
                      type="text"
                      value={firstname}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstname(e.target.value)}
                      placeholder="Your Firstname"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-center text-lg"
                      required
                      autoFocus
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/10 to-blue-500/10 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-pink-400 text-[10px] text-center font-medium mt-1 uppercase tracking-wider"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black rounded-2xl py-4 font-bold text-sm tracking-widest uppercase hover:bg-white/90 disabled:opacity-50 transition-all flex items-center justify-center relative overflow-hidden group"
                >
                  <span className={loading ? "opacity-0" : "opacity-100"}>Unlock</span>
                  {loading && <LoaderIcon className="w-5 h-5 absolute inset-0 m-auto text-black" />}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/5 w-full flex flex-col items-center gap-4">
                <button
                  onClick={handleAppKitLogin}
                  className="text-white/30 hover:text-white/60 text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
                >
                  Admin / Social Login
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-white/40 hover:text-white text-[10px] uppercase font-bold"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-12 text-white/30 text-[10px] uppercase tracking-widest font-body"
        >
          © {new Date().getFullYear()} Narinyland · Crafted for Two
        </motion.div>
      </div>

      <style jsx global>{`
        .font-heading {
          font-family: 'Pacifico', cursive;
        }
        .font-body {
          font-family: 'Outfit', sans-serif;
        }
      `}</style>
    </div>
  );
}
