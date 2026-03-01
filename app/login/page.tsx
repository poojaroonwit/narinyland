"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated } from '@/lib/auth';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated()) {
      router.replace('/');
    }
  }, [router]);

  const handleAuth = async (isSignUp = false) => {
    // Currently, login() handles both via the AppKit modal. 
    // In the future, we could pass a param to AppKit if supported: login({ action: isSignUp ? 'signup' : 'signin' })
    await login();
  };

  return (
    <div
      className="min-h-screen text-gray-800 relative selection:bg-pink-300 selection:text-pink-900"
      style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 70%, #f9a8d4 100%)',
        fontFamily: "'Outfit', sans-serif"
      }}
    >
      {/* Decorative Floating Elements (Background) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-pink-400 select-none drop-shadow-sm"
            initial={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              scale: 0.3 + Math.random() * 0.7,
              rotate: Math.random() * 360,
            }}
            animate={{
              y: [null, '-30px', '20px', '-10px'],
              rotate: [null, 15, -15, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 7,
              repeat: Infinity,
              repeatType: 'mirror',
              delay: Math.random() * 5,
            }}
            style={{ fontSize: `${20 + Math.random() * 40}px` }}
          >
            {['🌸', '💕', '✨', '🌷', '🌿', '🪴'][i % 6]}
          </motion.div>
        ))}
      </div>

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 py-4 px-6 md:px-12 z-50 flex items-center justify-between"
           style={{
             background: 'linear-gradient(to bottom, rgba(253, 242, 248, 0.95), rgba(253, 242, 248, 0))',
             backdropFilter: 'blur(10px)',
           }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-pink-400 to-rose-500 text-xl shadow-lg shadow-pink-500/30">
            🌳
          </div>
          <span
            className="text-2xl font-bold tracking-tight"
            style={{
              fontFamily: "'Pacifico', cursive",
              background: 'linear-gradient(135deg, #be185d, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Narinyland
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <button 
            onClick={() => handleAuth(false)}
            className="hidden md:block px-5 py-2 rounded-full font-medium text-pink-700 hover:bg-pink-100 transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={() => handleAuth(true)}
            className="px-6 py-2 rounded-full font-semibold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:-translate-y-0.5 transition-all bg-gradient-to-r from-pink-500 to-rose-500"
          >
            Get Started
          </button>
        </motion.div>
      </nav>

      {/* Main Content Container */}
      <main className="relative z-10 pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mt-10 md:mt-20 mb-24 md:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-gray-900 drop-shadow-sm">
              Nurture your love story in a <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">digital garden.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Grow a beautiful 3D tree together, save precious memories on an interactive timeline, and exchange digital love letters that unlock over time.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <button 
                onClick={() => handleAuth(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white text-lg shadow-xl shadow-pink-500/40 hover:shadow-pink-500/60 hover:-translate-y-1 transition-all bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center gap-2"
              >
                Create Your Garden
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
              
              <button 
                onClick={() => handleAuth(false)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-pink-700 bg-white/60 hover:bg-white/90 backdrop-blur-sm border border-pink-200 shadow-sm hover:shadow-md transition-all text-lg flex items-center justify-center gap-2"
              >
                Sign In to Continue
              </button>
            </div>
          </motion.div>
        </section>

        {/* Visual Showcase (Glassmorphism Mockup) */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-5xl rounded-3xl p-4 md:p-8 mb-32 relative shadow-[0_30px_60px_-15px_rgba(236,72,153,0.3)]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
          }}
        >
          {/* Faux Browser Window */}
          <div className="w-full h-[400px] md:h-[600px] rounded-2xl overflow-hidden bg-white/50 relative border border-white/40 flex items-center justify-center shadow-inner">
             {/* Abstract representation of the app since we can't load the actual canvas here easily */}
             <div className="absolute inset-0 bg-gradient-to-b from-sky-200 to-blue-100 opacity-60 rounded-2xl"></div>
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="text-[120px] md:text-[200px] filter drop-shadow-2xl z-10"
             >
               🌳
             </motion.div>
             <div className="absolute bottom-6 md:bottom-10 left-0 right-0 flex justify-center gap-4 z-20">
                <div className="h-12 w-32 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-white flex justify-center items-center font-semibold text-pink-600 gap-2"><span>Lv 3</span> ✨</div>
                <div className="h-12 w-48 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-white flex justify-center items-center font-semibold text-rose-600 gap-2"><span>1,204 Days</span> 💕</div>
             </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <section className="w-full max-w-6xl mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Everything you need, built for two.</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">A private, cozy space away from social media noise, designed exclusively for your relationship.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon="🌳" 
              title="Grow Your Love Tree" 
              desc="Interact with your personal 3D tree that grows as you log memories and spend time together." 
              delay={0.1}
            />
            <FeatureCard 
              icon="📸" 
              title="Interactive Timeline" 
              desc="Log photos, dates, and milestones on a beautiful, scrolling timeline that tells your unique story." 
              delay={0.2}
            />
            <FeatureCard 
              icon="💌" 
              title="Time-Locked Letters" 
              desc="Write letters to each other and set a future date for them to unlock. A digital time capsule." 
              delay={0.3}
            />
            <FeatureCard 
              icon="🎟️" 
              title="Custom Coupons" 
              desc="Create and redeem cute relationship coupons (like 'Free Back Massage' or 'Winner picks dinner')." 
              delay={0.4}
            />
            <FeatureCard 
              icon="🐾" 
              title="Virtual Companion" 
              desc="Meet Nari, your virtual pet companion who reacts to your milestones and grows alongside your tree." 
              delay={0.5}
            />
            <FeatureCard 
              icon="🔒" 
              title="Private & Secure" 
              desc="Your memories are stored securely and privately. Only you and your partner have access to your garden." 
              delay={0.6}
            />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="w-full max-w-4xl text-center mb-20 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-300 to-rose-300 rounded-[3rem] opacity-20 blur-3xl -z-10"></div>
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[3rem] p-12 md:p-20 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-['Pacifico',_cursive]">Ready to plant your seed?</h2>
            <p className="text-xl text-gray-600 mb-10 max-w-xl mx-auto">Join today and start building a beautiful digital home for your relationship memories.</p>
            <button 
              onClick={() => handleAuth(true)}
              className="px-10 py-5 rounded-full font-bold text-white text-xl shadow-xl shadow-pink-500/40 hover:shadow-pink-500/60 hover:-translate-y-1 transition-all bg-gradient-to-r from-pink-500 to-rose-500 w-full sm:w-auto"
            >
               Create Account — It's Free 💕
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-pink-200/50 bg-white/30 backdrop-blur-md pt-12 pb-8 px-6 text-center">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
           <div className="flex items-center gap-2">
             <span className="text-xl">🌳</span>
             <span className="text-xl font-bold text-pink-700" style={{ fontFamily: "'Pacifico', cursive" }}>Narinyland</span>
           </div>
           
           <div className="flex gap-6 text-gray-500 font-medium">
             <a href="#" className="hover:text-pink-600 transition-colors">Privacy</a>
             <a href="#" className="hover:text-pink-600 transition-colors">Terms</a>
             <a href="#" className="hover:text-pink-600 transition-colors">Contact</a>
           </div>
        </div>
        
        <p className="text-gray-400 text-sm mb-6">
          © {new Date().getFullYear()} Narinyland. Crafted with love.
        </p>

        {/* Developer Diagnostics (Subtle) */}
        <div 
          className="inline-flex items-center justify-center gap-2 text-pink-300/60 text-xs cursor-help px-3 py-1 hover:bg-white/40 rounded-full transition-colors"
          onClick={() => {
            const config = {
              'SDK_DOMAIN': process.env.NEXT_PUBLIC_APPKIT_DOMAIN || 'MISSING',
              'SDK_CLIENT_ID': process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID || 'MISSING',
              'NEXT_API_URL': process.env.NEXT_PUBLIC_API_URL || 'DEFAULT (/api)',
            };
            console.table(config);
            alert(`🔍 AppKit Status: ${config.SDK_CLIENT_ID === 'MISSING' ? '❌ ERROR' : '✅ CONFIGURED'}`);
          }}
        >
          <span>AlphaYard AppKit Support</span>
          <span>🔒</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: string, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl p-8 hover:bg-white/80 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1"
    >
      <div className="text-4xl mb-4 bg-pink-100 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
