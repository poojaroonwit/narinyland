"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { login } from "@/lib/auth";
import BlurText from "@/components/BlurText";
import Logo from "@/components/Logo";
import dynamic from "next/dynamic";

// Dynamically import 3D world to avoid SSR issues
const MarketingWorld3D = dynamic(() => import("@/components/MarketingWorld3D"), { ssr: false });

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

const FEATURES = [
  {
    id: "tree",
    title: "GROW YOUR LOVE TREE",
    desc: "A living representation of your bond. It reacts to your milestones and grows as you build your archive together.",
    label: "INFRASTRUCTURE_01",
  },
  {
    id: "timeline",
    title: "INTERACTIVE TIMELINE",
    desc: "Securely document your history. A tapestried journey of photos, voice notes, and milestones.",
    label: "INFRASTRUCTURE_02",
  },
  {
    id: "letters",
    title: "TIME-LOCKED LETTERS",
    desc: "Digital time capsules for your future self. Write today, unlock when the time is right.",
    label: "INFRASTRUCTURE_03",
  },
  {
    id: "nari",
    title: "VIRTUAL COMPANION",
    desc: "Nari celebrates your relationship growth and provides the emotional bridge between features.",
    label: "INFRASTRUCTURE_04",
  },
];

export default function MarketingPage() {
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAppKitLogin = async () => {
    setAuthError(null);
    try {
      await login();
    } catch (error) {
      console.error("AppKit login failed:", error);
      setAuthError(
        error instanceof Error
          ? error.message
          : "System connection failed. Please re-initialize."
      );
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-black font-geist overflow-hidden selection:bg-black selection:text-white">
      {/* ── Fixed Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-12 py-10">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <div className="flex items-center gap-12">
             <Logo size={40} title="Narinyland" />
             <div className="h-[1px] w-20 bg-black/10 hidden lg:block"></div>
             <div className="hidden lg:flex gap-10 text-[9px] font-black uppercase tracking-[0.5em] text-black/30">
                <span>ARCH_ID::24.0.1</span>
                <span>SYS_LINK::ESTABLISHED</span>
             </div>
          </div>
 
          <div className="flex items-center gap-12">
            <button
              onClick={handleAppKitLogin}
              className="hidden sm:block text-[9px] font-black uppercase tracking-[0.4em] text-black/30 hover:text-black transition-colors"
            >
              ACCESS_GATE
            </button>
            <button
              onClick={handleAppKitLogin}
              className="flex items-center gap-6 bg-black text-white px-10 py-5 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-neutral-800 transition-all active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
            >
              INITIALIZE_ARCHIVE
              <ArrowUpRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── 3D Background & Scrollytelling Wrapper ── */}
      <MarketingWorld3D>
        {/* ── Scrollytelling Content ── */}
        <main className="relative z-10">
          {/* Section 1: Hero */}
          <section className="h-screen flex flex-col items-center justify-center text-center px-8 relative">
             <div className="absolute top-40 left-12 flex flex-col items-start gap-4">
                <span className="text-[9px] font-black text-black/20 uppercase tracking-[0.8em]">NODE_01</span>
                <div className="w-[1px] h-32 bg-black/5"></div>
             </div>
             
             <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] font-black text-black/30 uppercase tracking-[0.8em] mb-12 flex items-center gap-6"
            >
              <span className="w-10 h-[1px] bg-black/10"></span>
              SYSTEM_STATUS: ONLINE // VERSION_2.4
              <span className="w-10 h-[1px] bg-black/10"></span>
            </motion.div>
 
            <div className="relative">
              <BlurText
                text="NURTURE"
                className="text-[clamp(6rem,18vw,20rem)] font-black text-black leading-[0.75] tracking-tighter"
                delay={0}
                animateBy="words"
                direction="bottom"
              />
              <BlurText
                text="ARCHIVE"
                className="text-[clamp(6rem,18vw,20rem)] font-black text-black leading-[0.75] tracking-tighter outline-text"
                delay={100}
                animateBy="words"
                direction="bottom"
              />
            </div>
 
            <motion.p
              className="mt-16 text-[10px] md:text-[12px] text-black/40 max-w-2xl font-black leading-loose uppercase tracking-[0.5em]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              A HIGH-FIDELITY ENVIRONMENT BUILT FOR <br/>
              DYNAMIC DUAL-USER INTERACTION PROTOCOLS.
            </motion.p>
 
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 2 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6"
            >
              <div className="text-[9px] font-black text-black/20 uppercase tracking-[0.8em]">EXPAND_ARCHIVE</div>
              <div className="w-[1px] h-20 bg-black/10 relative overflow-hidden">
                  <motion.div 
                      animate={{ y: [0, 80] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 left-0 w-full h-1/2 bg-black/40"
                  />
              </div>
            </motion.div>
          </section>

          {/* Section 2: Infrastructure / Features */}
          <section className="min-h-[300vh] py-64 px-20">
              <div className="sticky top-1/3 max-w-2xl">
                  <div className="flex items-center gap-6 mb-8">
                     <span className="w-12 h-[1px] bg-black"></span>
                     <p className="text-[10px] font-black text-black uppercase tracking-[0.6em]">
                         INFRASTRUCTURE_MODULES
                     </p>
                  </div>
                  <h2 className="text-[clamp(4rem,12vw,10rem)] font-black text-black mb-12 tracking-extratight leading-[0.8] uppercase">
                      SYSTEM_ARCHITECTURE.
                  </h2>
                  <div className="w-32 h-[2px] bg-black"></div>
              </div>
              
              <div className="space-y-[60vh] mt-[40vh] max-w-full mx-auto relative">
                  {FEATURES.map((f, i) => (
                      <motion.div
                          key={f.id}
                          initial={{ opacity: 0, y: 50 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 1.2, ease: "circOut" }}
                          viewport={{ margin: "-20%" }}
                          className={`max-w-xl p-16 border border-black/5 bg-white/80 backdrop-blur-3xl shadow-[0_60px_120px_rgba(0,0,0,0.05)] relative ${i % 2 === 0 ? 'ml-auto' : 'mr-auto'} rounded-none`}
                      >
                          <div className="absolute -top-6 -left-6 bg-black text-white px-8 py-3 text-[10px] font-black tracking-[0.4em]">
                             {f.label}
                          </div>
                          <h3 className="text-4xl font-black text-black mb-10 tracking-extratight uppercase leading-none">{f.title}</h3>
                          <p className="text-[12px] md:text-[14px] text-black/40 font-black uppercase tracking-[0.3em] leading-relaxed">
                              {f.desc}
                          </p>
                          <div className="mt-12 flex justify-end">
                             <div className="w-14 h-14 border border-black/5 flex items-center justify-center grayscale text-[10px] font-black text-black/20 uppercase tracking-widest">
                                {f.id === 'tree' && 'TR_01'}
                                {f.id === 'timeline' && 'TL_02'}
                                {f.id === 'letters' && 'LT_03'}
                                {f.id === 'nari' && 'AI_04'}
                             </div>
                          </div>
                      </motion.div>
                  ))}
              </div>
          </section>

          {/* Section 3: Pricing/Call to Action */}
          <section id="pricing" className="h-[150vh] flex items-center justify-center bg-transparent px-12">
              <div className="max-w-7xl w-full bg-white border border-black/5 p-40 text-center relative overflow-hidden shadow-[0_100px_200px_rgba(0,0,0,0.1)] rounded-none">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-20 bg-black"></div>
                   <p className="text-[11px] font-black text-black/20 uppercase tracking-[0.8em] mb-12">
                      GATEWAY_INITIALIZATION
                   </p>
                   <h2 className="text-[clamp(5rem,15vw,12rem)] font-black text-black mb-12 tracking-extratight uppercase leading-none">
                      OPEN_ACCESS.
                   </h2>
                   <div className="w-40 h-[1px] bg-black/10 mx-auto mb-16"></div>
                   <p className="text-[13px] text-black/40 font-black uppercase tracking-[0.5em] mb-20 max-w-3xl mx-auto leading-loose">
                      COMMENCE YOUR PRIVATE REPOSITORY DEPLOYMENT TODAY. <br/>
                      ENCRYPTION KEYS PROVIDED UPON INITIALIZATION.
                   </p>
                   <button
                      onClick={handleAppKitLogin}
                      className="bg-black text-white px-20 py-8 text-[12px] font-black uppercase tracking-[0.6em] hover:bg-neutral-800 transition-all active:scale-95 shadow-2xl relative group rounded-none"
                   >
                      <span className="relative z-10">REQUEST_GATE_ACCESS</span>
                      <div className="absolute inset-0 bg-white/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                   </button>
              </div>
          </section>

          {/* ── Footer ── */}
          <footer className="px-8 pb-12 pt-16">
              <div className="max-w-[1400px] mx-auto border-t border-black/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-4 grayscale opacity-30">
                      <Logo size={40} title="Narinyland" />
                  </div>
                  
                  <div className="flex gap-8 text-[9px] font-black text-black/30 uppercase tracking-[0.3em]">
                      {['About', 'Security', 'Privacy', 'Twitter', 'Github'].map(link => (
                          <button key={link} className="hover:text-black transition-colors">{link}</button>
                      ))}
                  </div>

                  <div className="text-[9px] font-black text-black/20 uppercase tracking-[0.1em]">
                      © {new Date().getFullYear()} NARINYLAND SYSTEM. ALL RIGHTS RESERVED.
                  </div>
              </div>
          </footer>
        </main>
      </MarketingWorld3D>

      {authError && (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 right-8 z-[200] archive-glass border-red-500/20 px-6 py-4 rounded-sm"
        >
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
               {authError}
            </p>
        </motion.div>
      )}

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        body {
          background-color: #ffffff;
        }
        .outline-text {
          -webkit-text-stroke: 1.5px black;
          color: transparent;
        }
        @media (max-width: 768px) {
          .outline-text {
            -webkit-text-stroke: 1px black;
          }
        }
      `}</style>
    </div>
  );
}
