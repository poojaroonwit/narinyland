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
  },
  zh: {
    signIn: "登录",
    getStarted: "开始使用",
    heroTitlePrefix: "在数字花园中培育你的",
    heroTitleHighlight: "爱情故事",
    heroDesc: "一起种植美丽的3D树，在互动的相册时间轴上保存珍贵的记忆，并交换随时间解锁的数字情书。",
    createGarden: "创建你的花园",
    signInToContinue: "登录以继续",
    lvlTag: "等级 3",
    daysTag: "1,204 天",
    featuresTitle: "你们需要的一切，专为双人打造。",
    featuresSubtitle: "一个远离社交媒体喧嚣的私人温馨空间，专为你们的关系设计。",
    f1Title: "培育爱情树",
    f1Desc: "与你的私人3D树互动，随着你们记录记忆和共度时光，它也会随之成长。",
    f2Title: "互动时间轴",
    f2Desc: "在滚动的时间轴上记录照片、约会和里程碑，讲述你们独特的故事。",
    f3Title: "时光情书",
    f3Desc: "写信给彼此，并设定未来的解锁日期。一个数字时间胶囊。",
    f4Title: "定制优惠券",
    f4Desc: "创建和兑换可爱的关系优惠券（比如“免费背部按摩”或“赢家决定晚餐”）。",
    f5Title: "虚拟宠物",
    f5Desc: "认识 Nari，你的虚拟宠物，它会对你们的里程碑做出反应，并与你们的树一起成长。",
    f6Title: "隐私与安全",
    f6Desc: "你们的记忆将被安全且隐秘地保存。只有你和你的伴侣可以访问你们的花园。",
    ctaTitle: "准备好播下种子了吗？",
    ctaDesc: "今天加入，开始为你们的恋爱记忆建立一个美丽的数字家园。",
    ctaButton: "创建账号 — 完全免费 💕",
    privacy: "隐私",
    terms: "条款",
    contact: "联系我们",
    footerText: "用爱精心打造。"
  },
  ja: {
    signIn: "ログイン",
    getStarted: "はじめる",
    heroTitlePrefix: "デジタルガーデンで育む",
    heroTitleHighlight: "愛の物語",
    heroDesc: "美しい3Dの木を一緒に育て、インタラクティブなタイムラインに大切な思い出を保存し、時が来るとロック解除されるデジタルラブレターを交換しましょう。",
    createGarden: "庭を作成する",
    signInToContinue: "ログインして続ける",
    lvlTag: "Lv 3",
    daysTag: "1,204 日",
    featuresTitle: "ふたりのために作られた、すべてがここに。",
    featuresSubtitle: "SNSのノイズから離れた、ふたりの関係のために特別に設計されたプライベートで居心地の良い空間。",
    f1Title: "愛の木を育てる",
    f1Desc: "思い出を記録し、一緒に時間を過ごすにつれて成長するプライベートな3Dの木と触れ合いましょう。",
    f2Title: "インタラクティブなタイムライン",
    f2Desc: "ふたりだけの物語を語る美しいスクロールタイムラインに、写真、デート、記念日を記録しましょう。",
    f3Title: "タイムロックレター",
    f3Desc: "お互いに手紙を書き、将来のロック解除の日付を設定します。デジタルのタイムカプセルです。",
    f4Title: "カスタムクーポン",
    f4Desc: "かわいいカップル用クーポンを作成して引き換えましょう（「無料の背中マッサージ」や「勝者が夕食を決める」など）。",
    f5Title: "バーチャルペット",
    f5Desc: "あなたたちの記念日に反応し、木と一緒に成長するバーチャルペットのNariに会いましょう。",
    f6Title: "プライバシーとセキュリティ",
    f6Desc: "思い出は安全かつプライベートに保存されます。庭にアクセスできるのはあなたとパートナーだけです。",
    ctaTitle: "種をまく準備はできましたか？",
    ctaDesc: "今すぐ参加して、ふたりの愛の思い出のための美しいデジタルホームを作り始めましょう。",
    ctaButton: "アカウント作成 — 無料です 💕",
    privacy: "プライバシー",
    terms: "利用規約",
    contact: "お問い合わせ",
    footerText: "愛を込めて作成。"
  },
  ko: {
    signIn: "로그인",
    getStarted: "시작하기",
    heroTitlePrefix: "디지털 정원에서 가꾸는 ",
    heroTitleHighlight: "사랑 이야기",
    heroDesc: "아름다운 3D 나무를 함께 키우고, 대화형 타임라인에 소중한 추억을 저장하며, 시간이 지나면 열리는 디지털 러브레터를 교환하세요.",
    createGarden: "여러분의 정원 만들기",
    signInToContinue: "계속하려면 로그인하세요",
    lvlTag: "Lv 3",
    daysTag: "1,204 일",
    featuresTitle: "두 사람을 위해 만들어진 모든 것.",
    featuresSubtitle: "소셜 미디어의 소음에서 벗어나 두 사람의 관계를 위해 특별히 설계된 아늑하고 프라이빗한 공간.",
    f1Title: "사랑의 나무 키우기",
    f1Desc: "추억을 기록하고 함께 시간을 보낼수록 성장하는 개인 3D 나무와 상호작용하세요.",
    f2Title: "대화형 타임라인",
    f2Desc: "두 사람만의 특별한 이야기를 담은 아름다운 타임라인에 사진, 데이트, 기념일을 기록하세요.",
    f3Title: "타임 캡슐 편지",
    f3Desc: "서로에게 편지를 쓰고 미래의 열림 날짜를 설정하세요. 디지털 타임 캡슐입니다.",
    f4Title: "맞춤형 쿠폰",
    f4Desc: "귀여운 커플 쿠폰을 만들고 사용해 보세요 ('무료 등 마사지' 또는 '이긴 사람이 저녁 메뉴 결정하기' 등).",
    f5Title: "가상 반려동물",
    f5Desc: "기념일에 반응하고 나무와 함께 성장하는 가상 반려동물 Nari를 만나보세요.",
    f6Title: "프라이버시 & 보안",
    f6Desc: "여러분의 추억은 안전하고 비밀스럽게 보관됩니다. 당신과 파트너만 정원에 접근할 수 있습니다.",
    ctaTitle: "씨앗을 심을 준비가 되셨나요?",
    ctaDesc: "오늘 가입하여 두 사람의 사랑스러운 추억을 위한 아름다운 디지털 집을 짓기 시작하세요.",
    ctaButton: "계정 만들기 — 무료입니다 💕",
    privacy: "개인정보처리방침",
    terms: "이용약관",
    contact: "문의하기",
    footerText: "사랑을 담아 만들었습니다."
  },
  es: {
    signIn: "Iniciar sesión",
    getStarted: "Comenzar",
    heroTitlePrefix: "Cultiva tu historia de amor en un ",
    heroTitleHighlight: "jardín digital.",
    heroDesc: "Hagan crecer un hermoso árbol 3D juntos, guarden recuerdos valiosos en una línea de tiempo interactiva e intercambien cartas de amor que se desbloquean con el tiempo.",
    createGarden: "Crea tu jardín",
    signInToContinue: "Inicia sesión para continuar",
    lvlTag: "Nivel 3",
    daysTag: "1,204 Días",
    featuresTitle: "Todo lo que necesitan, construido para dos.",
    featuresSubtitle: "Un espacio acogedor y privado, lejos del ruido de las redes sociales, diseñado exclusivamente para su relación.",
    f1Title: "Cultiven su árbol del amor",
    f1Desc: "Interactúen con su árbol 3D personal que crece a medida que registran recuerdos y pasan tiempo juntos.",
    f2Title: "Línea de tiempo interactiva",
    f2Desc: "Registren fotos, fechas y momentos importantes en una hermosa línea de tiempo que cuenta su historia única.",
    f3Title: "Cartas bloqueadas en el tiempo",
    f3Desc: "Escriban cartas el uno para el otro y establezcan una fecha futura para que se desbloqueen. Una cápsula del tiempo.",
    f4Title: "Cupones personalizados",
    f4Desc: "Creen y canjeen lindos cupones de pareja (como 'Masaje de espalda gratis' o 'El ganador elige la cena').",
    f5Title: "Mascota virtual",
    f5Desc: "Conozcan a Nari, su mascota virtual que reacciona a sus momentos importantes y crece junto con su árbol.",
    f6Title: "Privado y seguro",
    f6Desc: "Sus recuerdos se almacenan de forma segura y privada. Solo tú y tu pareja tienen acceso a su jardín.",
    ctaTitle: "¿Listos para plantar su semilla?",
    ctaDesc: "Únanse hoy y comiencen a construir un hermoso hogar digital para los recuerdos de su relación.",
    ctaButton: "Crear cuenta — Es gratis 💕",
    privacy: "Privacidad",
    terms: "Términos",
    contact: "Contacto",
    footerText: "Hecho con amor."
  },
  fr: {
    signIn: "Se connecter",
    getStarted: "Commencer",
    heroTitlePrefix: "Cultivez votre histoire d'amour dans un ",
    heroTitleHighlight: "jardin numérique.",
    heroDesc: "Faites pousser un bel arbre 3D ensemble, enregistrez de précieux souvenirs sur une chronologie interactive et échangez des lettres d'amour qui se déverrouillent avec le temps.",
    createGarden: "Créez votre jardin",
    signInToContinue: "Connectez-vous pour continuer",
    lvlTag: "Niv 3",
    daysTag: "1 204 Jours",
    featuresTitle: "Tout ce dont vous avez besoin, conçu pour deux.",
    featuresSubtitle: "Un espace privé et douillet loin du bruit des réseaux sociaux, conçu exclusivement pour votre relation.",
    f1Title: "Faites grandir votre arbre d'amour",
    f1Desc: "Interagissez avec votre arbre 3D personnel qui grandit à mesure que vous enregistrez des souvenirs et passez du temps ensemble.",
    f2Title: "Chronologie interactive",
    f2Desc: "Enregistrez des photos, des dates et des événements marquants sur une magnifique chronologie qui raconte votre histoire unique.",
    f3Title: "Lettres verrouillées dans le temps",
    f3Desc: "Écrivez-vous des lettres et définissez une date future pour qu'elles se déverrouillent. Une capsule temporelle.",
    f4Title: "Coupons personnalisés",
    f4Desc: "Créez et échangez de mignons coupons de couple (comme 'Massage du dos gratuit' ou 'Le gagnant choisit le dîner').",
    f5Title: "Compagnon virtuel",
    f5Desc: "Rencontrez Nari, votre compagnon virtuel qui réagit à vos événements marquants et grandit avec votre arbre.",
    f6Title: "Privé et sécurisé",
    f6Desc: "Vos souvenirs sont stockés en toute sécurité et confidentialité. Vous seuls avez accès à votre jardin.",
    ctaTitle: "Prêts à planter votre graine ?",
    ctaDesc: "Rejoignez-nous aujourd'hui et commencez à construire une belle maison numérique pour vos souvenirs de couple.",
    ctaButton: "Créer un compte — C'est gratuit 💕",
    privacy: "Confidentialité",
    terms: "Conditions",
    contact: "Contact",
    footerText: "Fait avec amour."
  }
};

type Lang = 'en' | 'th' | 'zh' | 'ja' | 'ko' | 'es' | 'fr';

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
    if (browserLang) {
      const lowerLang = browserLang.toLowerCase();
      if (lowerLang.startsWith('th')) setLang('th');
      else if (lowerLang.startsWith('zh')) setLang('zh');
      else if (lowerLang.startsWith('ja')) setLang('ja');
      else if (lowerLang.startsWith('ko')) setLang('ko');
      else if (lowerLang.startsWith('es')) setLang('es');
      else if (lowerLang.startsWith('fr')) setLang('fr');
    }
  }, [router]);

  const handleAuth = async (isSignUp = false) => {
    // Currently, login() handles both via the AppKit modal. 
    // In the future, we could pass a param to AppKit if supported: login({ action: isSignUp ? 'signup' : 'signin' })
    await login();
  };

  const t = dict[lang];

  // Dynamic font based on language
  const customFont = 
    lang === 'th' ? "'Kanit', sans-serif" : 
    lang === 'zh' ? "'Noto Sans SC', sans-serif" :
    lang === 'ja' ? "'Noto Sans JP', sans-serif" :
    lang === 'ko' ? "'Noto Sans KR', sans-serif" :
    "'Outfit', sans-serif";
    
  const customTitleFont = 
    lang === 'th' ? "'Kanit', sans-serif" : 
    lang === 'zh' ? "'Noto Sans SC', sans-serif" :
    lang === 'ja' ? "'Noto Sans JP', sans-serif" :
    lang === 'ko' ? "'Noto Sans KR', sans-serif" :
    "'Pacifico', cursive";

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
          <div className="relative">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="appearance-none bg-white/80 border border-pink-200 text-pink-700 text-sm font-semibold rounded-full px-3 py-1.5 pr-7 hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 transition-colors shadow-sm cursor-pointer"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="th">ไทย</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-pink-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
          
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
