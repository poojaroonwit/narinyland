"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated } from '@/lib/auth';
import { motion } from 'framer-motion';

// Translation Dictionary
const dict = {
  en: {
    signIn: "Sign In",
    getStarted: "Get Started",
    heroTitlePrefix: "Nurture your love story in a ",
    heroTitleHighlight: "digital garden.",
    heroDesc: "Grow a beautiful 3D tree together, save precious memories on an interactive timeline, and exchange digital love letters that unlock over time.",
    createGarden: "Create Your Garden",
    signInToContinue: "Sign In to Continue",
    lvlTag: "Lv 3",
    daysTag: "1,204 Days",
    featuresTitle: "Everything you need, built for two.",
    featuresSubtitle: "A private, cozy space away from social media noise, designed exclusively for your relationship.",
    f1Title: "Grow Your Love Tree",
    f1Desc: "Interact with your personal 3D tree that grows as you log memories and spend time together.",
    f2Title: "Interactive Timeline",
    f2Desc: "Log photos, dates, and milestones on a beautiful, scrolling timeline that tells your unique story.",
    f3Title: "Time-Locked Letters",
    f3Desc: "Write letters to each other and set a future date for them to unlock. A digital time capsule.",
    f4Title: "Custom Coupons",
    f4Desc: "Create and redeem cute relationship coupons (like 'Free Back Massage' or 'Winner picks dinner').",
    f5Title: "Virtual Companion",
    f5Desc: "Meet Nari, your virtual pet companion who reacts to your milestones and grows alongside your tree.",
    f6Title: "Private & Secure",
    f6Desc: "Your memories are stored securely and privately. Only you and your partner have access to your garden.",
    ctaTitle: "Ready to plant your seed?",
    ctaDesc: "Join today and start building a beautiful digital home for your relationship memories.",
    ctaButton: "Create Account — It's Free 💕",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    footerText: "Crafted with love."
  },
  th: {
    signIn: "เข้าสู่ระบบ",
    getStarted: "เริ่มต้นใช้งาน",
    heroTitlePrefix: "หล่อเลี้ยงเรื่องราวความรักของคุณใน",
    heroTitleHighlight: "สวนดิจิทัล",
    heroDesc: "ปลูกต้นไม้ 3 มิติที่สวยงามด้วยกัน บันทึกความทรงจำอันมีค่าบนไทม์ไลน์ที่โต้ตอบได้ และแลกเปลี่ยนจดหมายรักดิจิทัลที่จะปลดล็อคเมื่อเวลาผ่านไป",
    createGarden: "สร้างสวนของคุณ",
    signInToContinue: "เข้าสู่ระบบเพื่อดำเนินการต่อ",
    lvlTag: "เลเวล 3",
    daysTag: "1,204 วัน",
    featuresTitle: "ทุกสิ่งที่คุณต้องการ สร้างมาเพื่อสองเรา",
    featuresSubtitle: "พื้นที่ส่วนตัวแสนอบอุ่น ห่างไกลจากความวุ่นวายของโซเชียลมีเดีย ออกแบบมาเพื่อความสัมพันธ์ของคุณโดยเฉพาะ",
    f1Title: "ปลูกต้นไม้แห่งความรัก",
    f1Desc: "โต้ตอบกับต้นไม้ 3 มิติส่วนตัวของคุณที่เติบโตขึ้นเมื่อคุณบันทึกความทรงจำและใช้เวลาร่วมกัน",
    f2Title: "ไทม์ไลน์แบบโต้ตอบ",
    f2Desc: "บันทึกรูปภาพ วันที่ และเหตุการณ์สำคัญบนไทม์ไลน์ที่เลื่อนดูได้อย่างสวยงาม ซึ่งบอกเล่าเรื่องราวที่เป็นเอกลักษณ์ของคุณ",
    f3Title: "จดหมายล็อคเวลา",
    f3Desc: "เขียนจดหมายหากันและตั้งวันที่ในอนาคตเพื่อปลดล็อค แคปซูลเวลาดิจิทัล",
    f4Title: "คูปองแบบกำหนดเอง",
    f4Desc: "สร้างและแลกคูปองความสัมพันธ์ที่น่ารัก (เช่น 'นวดหลังฟรี' หรือ 'ผู้ชนะเลือกอาหารเย็น')",
    f5Title: "สัตว์เลี้ยงเสมือนจริง",
    f5Desc: "พบกับ Nari สัตว์เลี้ยงเสมือนจริงที่จะโต้ตอบกับเหตุการณ์สำคัญของคุณและเติบโตไปพร้อมกับต้นไม้ของคุณ",
    f6Title: "เป็นส่วนตัว & ปลอดภัย",
    f6Desc: "ความทรงจำของคุณจะถูกจัดเก็บอย่างปลอดภัยและเป็นส่วนตัว มีเพียงคุณและคู่ของคุณเท่านั้นที่สามารถเข้าถึงสวนของคุณได้",
    ctaTitle: "พร้อมที่จะปลูกเมล็ดพันธุ์ของคุณหรือยัง?",
    ctaDesc: "เข้าร่วมวันนี้และเริ่มสร้างบ้านดิจิทัลที่สวยงามสำหรับความทรงจำความสัมพันธ์ของคุณ",
    ctaButton: "สร้างบัญชี — ฟรี 💕",
    privacy: "ความเป็นส่วนตัว",
    terms: "ข้อกำหนด",
    contact: "ติดต่อ",
    footerText: "สร้างสรรค์ด้วยความรัก"
  }
};

type Lang = 'en' | 'th';

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated()) {
      router.replace('/');
    }

    // Auto-detect language
    const browserLang = navigator.language || navigator.languages?.[0];
    if (browserLang && browserLang.toLowerCase().startsWith('th')) {
      setLang('th');
    }
  }, [router]);

  const handleAuth = async (isSignUp = false) => {
    // Currently, login() handles both via the AppKit modal. 
    // In the future, we could pass a param to AppKit if supported: login({ action: isSignUp ? 'signup' : 'signin' })
    await login();
  };

  const t = dict[lang];

  // Dynamic font based on language
  const customFont = lang === 'en' ? "'Outfit', sans-serif" : "'Kanit', sans-serif";
  const customTitleFont = lang === 'en' ? "'Pacifico', cursive" : "'Kanit', sans-serif";

  return (
    <div
      className="min-h-screen text-gray-800 relative selection:bg-pink-300 selection:text-pink-900"
      style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 70%, #f9a8d4 100%)',
        fontFamily: customFont,
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
            className={`text-2xl font-bold tracking-tight ${lang === 'th' ? 'mt-1' : ''}`}
            style={{
              fontFamily: customTitleFont,
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
          {/* Language Switcher */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-pink-200 text-pink-600 font-bold hover:bg-pink-100 transition-colors text-sm shadow-sm opacity-80"
          >
            {lang === 'en' ? 'EN' : 'TH'}
          </button>
          
          <button 
            onClick={() => handleAuth(false)}
            className="hidden md:block px-5 py-2 rounded-full font-medium text-pink-700 hover:bg-pink-100 transition-colors"
          >
            {t.signIn}
          </button>
          <button 
            onClick={() => handleAuth(true)}
            className="px-6 py-2 rounded-full font-semibold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:-translate-y-0.5 transition-all bg-gradient-to-r from-pink-500 to-rose-500"
          >
            {t.getStarted}
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
              {t.heroTitlePrefix} <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">{t.heroTitleHighlight}</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t.heroDesc}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <button 
                onClick={() => handleAuth(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white text-lg shadow-xl shadow-pink-500/40 hover:shadow-pink-500/60 hover:-translate-y-1 transition-all bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center gap-2"
              >
                {t.createGarden}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
              
              <button 
                onClick={() => handleAuth(false)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-pink-700 bg-white/60 hover:bg-white/90 backdrop-blur-sm border border-pink-200 shadow-sm hover:shadow-md transition-all text-lg flex items-center justify-center gap-2"
              >
                {t.signInToContinue}
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
                <div className="h-12 w-32 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-white flex justify-center items-center font-semibold text-pink-600 gap-2"><span>{t.lvlTag}</span> ✨</div>
                <div className="h-12 w-48 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-white flex justify-center items-center font-semibold text-rose-600 gap-2"><span>{t.daysTag}</span> 💕</div>
             </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <section className="w-full max-w-6xl mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">{t.featuresTitle}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t.featuresSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon="🌳" 
              title={t.f1Title} 
              desc={t.f1Desc} 
              delay={0.1}
            />
            <FeatureCard 
              icon="📸" 
              title={t.f2Title} 
              desc={t.f2Desc} 
              delay={0.2}
            />
            <FeatureCard 
              icon="💌" 
              title={t.f3Title} 
              desc={t.f3Desc} 
              delay={0.3}
            />
            <FeatureCard 
              icon="🎟️" 
              title={t.f4Title} 
              desc={t.f4Desc} 
              delay={0.4}
            />
            <FeatureCard 
              icon="🐾" 
              title={t.f5Title} 
              desc={t.f5Desc} 
              delay={0.5}
            />
            <FeatureCard 
              icon="🔒" 
              title={t.f6Title} 
              desc={t.f6Desc} 
              delay={0.6}
            />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="w-full max-w-4xl text-center mb-20 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-300 to-rose-300 rounded-[3rem] opacity-20 blur-3xl -z-10"></div>
          <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[3rem] p-12 md:p-20 shadow-2xl">
            <h2 
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
              style={{ fontFamily: customTitleFont }}
            >
              {t.ctaTitle}
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-xl mx-auto">{t.ctaDesc}</p>
            <button 
              onClick={() => handleAuth(true)}
              className="px-10 py-5 rounded-full font-bold text-white text-xl shadow-xl shadow-pink-500/40 hover:shadow-pink-500/60 hover:-translate-y-1 transition-all bg-gradient-to-r from-pink-500 to-rose-500 w-full sm:w-auto"
            >
               {t.ctaButton}
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-pink-200/50 bg-white/30 backdrop-blur-md pt-12 pb-8 px-6 text-center">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
           <div className="flex items-center gap-2">
             <span className="text-xl">🌳</span>
             <span 
               className="text-xl font-bold text-pink-700" 
               style={{ fontFamily: customTitleFont }}
              >
                Narinyland
              </span>
           </div>
           
           <div className="flex gap-6 text-gray-500 font-medium">
             <a href="#" className="hover:text-pink-600 transition-colors">{t.privacy}</a>
             <a href="#" className="hover:text-pink-600 transition-colors">{t.terms}</a>
             <a href="#" className="hover:text-pink-600 transition-colors">{t.contact}</a>
           </div>
        </div>
        
        <p className="text-gray-400 text-sm mb-6">
          © {new Date().getFullYear()} Narinyland. {t.footerText}
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
