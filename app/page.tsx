"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { login } from "@/lib/auth";
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

const FEATURES = [
  {
    id: "tree",
    emoji: "🌳",
    title: "Grow Your Love Tree",
    desc: "Interact with your personal 3D tree that grows as you log memories and spend time together.",
  },
  {
    id: "timeline",
    emoji: "📸",
    title: "Interactive Timeline",
    desc: "Log photos, dates, and milestones on a beautiful, scrolling timeline that tells your unique story.",
  },
  {
    id: "letters",
    emoji: "💌",
    title: "Time-Locked Letters",
    desc: "Write letters to each other and set a future date for them to unlock. A digital time capsule.",
  },
  {
    id: "coupons",
    emoji: "🎟️",
    title: "Custom Coupons",
    desc: "Create and redeem cute relationship coupons (like 'Free Back Massage' or 'Winner picks dinner').",
  },
  {
    id: "nari",
    emoji: "🐾",
    title: "Virtual Companion",
    desc: "Meet Nari, your virtual pet companion who reacts to your milestones and grows alongside your tree.",
  },
  {
    id: "secure",
    emoji: "🔒",
    title: "Private & Secure",
    desc: "Your memories are stored securely and privately. Only you and your partner have access to your garden.",
  },
];

const SHOWCASE_ITEMS = [
  {
    id: "tree-example",
    title: "The Heart of Your Garden",
    subtitle: "Grow Your Love Tree",
    desc: "Your tree is a living reflection of your relationship. It reacts to your interactions, grows taller with every memory logged, and changes with the seasons of your love.",
    image: "/images/showcase/tree.png",
    accent: "bg-pink-100",
  },
  {
    id: "timeline-example",
    title: "A Tapestry of Moments",
    subtitle: "Interactive Timeline",
    desc: "Our timeline isn't just a list—it's a beautiful, interactive journey. Scroll back through years of photos, voice notes, and milestones, presented in a sleek, modern gallery.",
    image: "/images/showcase/timeline.png",
    accent: "bg-blue-100",
  },
  {
    id: "nari-example",
    title: "Your Loyal Companion",
    subtitle: "Virtual Pet Nari",
    desc: "Nari lives in your garden and keeps you company. Nari celebrates your milestones with you, sends you reminders of special dates, and grows alongside your relationship.",
    image: "/images/showcase/nari.png",
    accent: "bg-green-100",
  },
  {
    id: "coupons-example",
    title: "Playful Acts of Love",
    subtitle: "Digital Love Coupons",
    desc: "Give and redeem custom coupons for special favors or activities. A fun and affectionate way to keep the spark alive every day.",
    image: "/images/showcase/coupons.png",
    accent: "bg-purple-100",
  },
];

const NAV_LINKS = [
  { label: "About Us", href: "#features" },
  { label: "Features", href: "#features" },
];

export default function MarketingPage() {
  const [authError, setAuthError] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };


  const handleAppKitLogin = async () => {
    setAuthError(null);
    try {
      await login();
    } catch (error) {
      console.error("AppKit login failed:", error);
      setAuthError(
        error instanceof Error
          ? error.message
          : "We couldn't open sign in right now. Please try again."
      );
    }
  };

  return (
    <div className="w-full min-h-screen bg-pink-50">
      {/* ── Fixed Navbar ── */}
      <nav className="fixed top-4 left-0 right-0 z-[100] px-6 lg:px-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center -ml-2">
            <Logo size={80} title="Narinyland" />
          </div>

          <div className="hidden md:flex items-center liquid-glass rounded-full px-2 py-1.5 gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href.replace("#", ""))}
                className="px-4 py-2 text-xs font-bold text-white uppercase tracking-widest font-body hover:text-white/80 transition-colors rounded-full"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("pricing")}
              className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white uppercase tracking-widest font-body hover:text-white/80 transition-colors rounded-full"
            >
              Pricing
              <span className="text-[9px] bg-white/20 text-white rounded-full px-1.5 py-0.5 leading-none font-black ml-1">
                SOON
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAppKitLogin}
              className="hidden sm:block text-xs font-bold text-white uppercase tracking-widest font-body hover:text-white/80 transition-colors px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={handleAppKitLogin}
              className="flex items-center gap-2 bg-white text-black rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest font-body hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
            >
              Sign Up
              <ArrowUpRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section id="hero" className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background Video */}
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
        <div className="absolute inset-0 bg-black/20 z-[1]" />

        <div className="relative z-10 flex flex-col items-center text-center px-4 pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center liquid-glass rounded-full px-1 py-1 mb-6"
          >
            <span className="bg-white text-black rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              NEW
            </span>
            <span className="text-xs font-bold text-white pr-4 pl-3 uppercase tracking-widest font-body">
              Your private digital love garden awaits
            </span>
          </motion.div>

          <BlurText
            text="Nurture Your Love Story"
            className="text-6xl md:text-8xl lg:text-[7rem] font-heading italic text-white leading-none max-w-4xl justify-center tracking-[-0.04em]"
            delay={100}
            animateBy="words"
            direction="bottom"
          />

          <motion.p
            className="mt-6 text-sm md:text-base text-white/80 max-w-xl font-body font-medium leading-relaxed uppercase tracking-widest"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            Grow a 3D tree together, save memories on an interactive timeline, and exchange digital love letters.
          </motion.p>

          <motion.div
            className="flex items-center gap-6 mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <button
              onClick={handleAppKitLogin}
              className="liquid-glass-strong flex items-center gap-3 rounded-full px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-white font-body hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
              Enter Garden
              <ArrowUpRightIcon className="h-5 w-5" />
            </button>
          </motion.div>

          {authError && (
            <motion.p
              className="mt-4 max-w-lg rounded-full bg-red-500/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {authError}
            </motion.p>
          )}
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 pointer-events-none z-[5]">
          <motion.div 
            className="absolute top-1/4 left-1/4 w-32 h-32 bg-pink-400/20 rounded-full blur-3xl"
            animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl text-4xl flex items-center justify-center"
            animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          >
             🌸
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-32 px-6 lg:px-16 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-pink-50 to-transparent opacity-50" />
        
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black font-body text-pink-500 uppercase tracking-[0.4em] mb-4">
              Our Services
            </p>
            <h2 className="text-5xl md:text-7xl font-heading italic text-black mb-6 tracking-tight">
              Everything you need, built for two.
            </h2>
            <p className="text-base text-gray-400 font-body font-bold max-w-xl mx-auto uppercase tracking-widest">
              A private space away from social media noise, designed exclusively for your relationship.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group bg-pink-50/50 rounded-[2.5rem] p-10 border border-pink-100/50 hover:bg-white hover:shadow-2xl hover:border-white transition-all duration-500 flex flex-col items-start"
              >
                <div className="text-5xl mb-8 group-hover:scale-125 transition-transform duration-500 origin-left">{f.emoji}</div>
                <h3 className="text-2xl font-heading italic text-black mb-4">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 font-body font-medium leading-relaxed uppercase tracking-widest opacity-80 mb-8">
                  {f.desc}
                </p>
                
                {["tree", "timeline", "coupons", "nari"].includes(f.id) && (
                  <button 
                    onClick={() => scrollTo(`${f.id}-example`)}
                    className="mt-auto text-[10px] font-black uppercase tracking-[0.2em] text-pink-500 hover:text-pink-600 flex items-center gap-2 group/btn"
                  >
                    See Example
                    <motion.span 
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ↓
                    </motion.span>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase Section ── */}
      <section id="showcase" className="py-32 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 lg:px-16">
          <div className="text-center mb-32">
            <p className="text-[10px] font-black font-body text-pink-500 uppercase tracking-[0.4em] mb-4">
              The Experience
            </p>
            <h2 className="text-5xl md:text-7xl font-heading italic text-black mb-6 tracking-tight">
              See how your garden grows.
            </h2>
          </div>

          <div className="space-y-40">
            {SHOWCASE_ITEMS.map((item, i) => (
              <div 
                key={item.id} 
                id={item.id}
                className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-16 lg:gap-24`}
              >
                <motion.div 
                  initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="w-full md:w-1/2"
                >
                  <div className={`relative rounded-[3rem] overflow-hidden shadow-2xl ${item.accent} aspect-square p-2 group`}>
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover rounded-[2.5rem] transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>

                <motion.div 
                   initial={{ opacity: 0, x: i % 2 === 0 ? 50 : -50 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   viewport={{ once: true, margin: "-100px" }}
                   className="w-full md:w-1/2 text-left"
                >
                  <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest mb-6">
                    {item.subtitle}
                  </div>
                  <h3 className="text-4xl md:text-5xl font-heading italic text-black mb-8 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-base text-gray-500 font-body font-medium leading-relaxed uppercase tracking-widest opacity-80 mb-10">
                    {item.desc}
                  </p>
                  <button 
                    onClick={handleAppKitLogin}
                    className="flex items-center gap-3 bg-black text-white rounded-full px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
                  >
                    Start Your Story
                    <ArrowUpRightIcon className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="py-32 px-6 lg:px-16 bg-pink-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] font-black font-body text-pink-500 uppercase tracking-[0.4em] mb-4">
            Pricing
          </p>
          <h2 className="text-5xl md:text-7xl font-heading italic text-black mb-16 tracking-tight">
            Simple, honest love.
          </h2>

          <div className="bg-white rounded-[3rem] p-16 border border-pink-100 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
               <HeartIcon className="w-40 h-40 text-pink-500" />
            </div>
            
            <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest mb-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
              </span>
              Coming Soon
            </div>
            
            <div className="text-8xl font-heading italic text-black mb-4">
              Free
            </div>
            <p className="text-sm text-gray-400 font-black uppercase tracking-[0.2em] mb-12">
              forever, for couples
            </p>
            
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-left max-w-2xl mx-auto mb-16">
              {[
                "Shared 3D Love Tree",
                "Unlimited memories & timeline",
                "Time-locked love letters",
                "Custom relationship coupons",
                "Virtual pet companion (Nari)",
                "Private & encrypted vault",
              ].map((item) => (
                <li key={item} className="flex items-center gap-4 text-sm font-bold text-gray-600 uppercase tracking-widest">
                  <span className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 text-[10px]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            
            <button
              onClick={handleAppKitLogin}
              className="bg-black text-white rounded-full px-10 py-5 text-sm font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              Join the Waitlist
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}

      <footer className="bg-white border-t border-pink-100 px-6 lg:px-16 pt-24 pb-12">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-12 text-center">
          <Logo size={120} title="Narinyland" />
          <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.3em] max-w-md">
            A private digital garden for couples to grow their love story together.
          </p>
          
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
            {['About Us', 'Features', 'Pricing', 'Privacy', 'Terms'].map(link => (
                <button key={link} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-pink-500 transition-colors">
                    {link}
                </button>
            ))}
          </div>
          
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest mt-8">
            © {new Date().getFullYear()} Narinyland · Crafted with Love
          </p>
        </div>
      </footer>

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
