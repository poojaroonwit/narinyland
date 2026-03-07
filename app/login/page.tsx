"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import BlurText from "@/components/BlurText";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_115329_5e00c9c5-4d69-49b7-94c3-9c31c60bb644.mp4";

// Inline SVG icons (no lucide-react dependency)
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

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

const PARTNERS = ["Aeon", "Vela", "Apex", "Orbit", "Zeno"];

const NAV_LINKS = ["Home", "Voyages", "Worlds", "Innovation"];

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.replace("/");
    }
  }, [router, isLoggedIn, authLoading]);

  const handleAuth = async () => {
    await login();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[hsl(213,45%,67%)]">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/images/hero_bg.jpeg"
        src={VIDEO_URL}
      />
      {/* Video overlay */}
      <div className="absolute inset-0 bg-black/5 z-0" />

      {/* All content above video */}
      <div className="relative z-10 flex flex-col w-full h-full">
        {/* ── Navbar ── */}
        <nav className="fixed top-4 left-0 right-0 z-50 px-8 lg:px-16">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="h-12 w-12 rounded-full liquid-glass flex items-center justify-center">
              <span className="text-white font-heading italic text-lg leading-none">N</span>
            </div>

            {/* Center nav pill (desktop only) */}
            <div className="hidden md:flex items-center liquid-glass rounded-full px-2 py-1.5 gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link}
                  className="px-3 py-2 text-sm font-medium text-white/90 font-body hover:text-white transition-colors rounded-full"
                >
                  {link}
                </button>
              ))}
              <button
                onClick={handleAuth}
                className="flex items-center gap-1.5 bg-white text-black rounded-full px-3.5 py-1.5 text-sm font-medium font-body hover:bg-white/90 transition-colors"
              >
                Claim a Spot
                <ArrowUpRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile: single CTA */}
            <button
              onClick={handleAuth}
              className="md:hidden flex items-center gap-1.5 bg-white text-black rounded-full px-3.5 py-1.5 text-sm font-medium font-body"
            >
              Sign In
              <ArrowUpRightIcon className="h-4 w-4" />
            </button>
          </div>
        </nav>

        {/* ── Hero Content ── */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-24">
          {/* Badge */}
          <div className="flex items-center liquid-glass rounded-full px-1 py-1 mb-2">
            <span className="bg-white text-black rounded-full px-3 py-1 text-xs font-semibold font-body">
              New
            </span>
            <span className="text-sm text-white/90 pr-3 pl-2 font-body">
              Maiden Crewed Voyage to Mars Arrives 2026
            </span>
          </div>

          {/* Heading */}
          <BlurText
            text="Venture Past Our Sky Across the Universe"
            className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.8] max-w-2xl justify-center tracking-[-4px]"
            delay={100}
            animateBy="words"
            direction="bottom"
          />

          {/* Subheading */}
          <motion.p
            className="mt-1 text-sm md:text-base text-white max-w-2xl font-body font-light leading-tight"
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          >
            Discover the universe in ways once unimaginable. Our pioneering
            vessels and breakthrough engineering bring deep-space exploration
            within reach—secure and extraordinary.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex items-center gap-6 mt-4"
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
          >
            <button
              onClick={handleAuth}
              className="liquid-glass-strong flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white font-body hover:opacity-90 transition-opacity"
            >
              Start Your Voyage
              <ArrowUpRightIcon className="h-5 w-5" />
            </button>
            <button className="flex items-center gap-2 text-white text-sm font-medium font-body hover:opacity-80 transition-opacity">
              View Liftoff
              <PlayIcon className="h-4 w-4 fill-current" />
            </button>
          </motion.div>
        </div>

        {/* ── Partners Bar ── */}
        <div className="flex flex-col items-center gap-4 pb-8">
          <div className="liquid-glass rounded-full px-3.5 py-1">
            <span className="text-xs font-medium text-white font-body">
              Collaborating with top aerospace pioneers globally
            </span>
          </div>
          <div className="flex items-center gap-12 md:gap-16">
            {PARTNERS.map((name) => (
              <span
                key={name}
                className="text-2xl md:text-3xl font-heading italic text-white tracking-tight"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
