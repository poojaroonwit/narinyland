"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated } from '@/lib/auth';
import { motion } from 'framer-motion';

// Translation Dictionary
const dict = {
  en: {
    signIn: "Sign In",
    getStarted: "Sign Up",
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
    showcase1Title: "Your love story, beautifully documented.",
    showcase1Desc: "Scroll through your most cherished memories. Add photos, notes, and locations to a shared timeline that grows with your relationship.",
    showcase2Title: "Letters for the future.",
    showcase2Desc: "Write your heart out and lock it until a special date. A digital time capsule for anniversary surprises.",
    showcase3Title: "Little gifts, big smiles.",
    showcase3Desc: "Create custom love coupons and redeem them for cute favors, like a back massage.",
    footerText: "Crafted with love."
  },
  th: {
    signIn: "เข้าสู่ระบบ",
    getStarted: "ลงทะเบียน",
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
    showcase1Title: "เรื่องราวความรักของคุณที่ถูกบันทึกไว้อย่างสวยงาม",
    showcase1Desc: "เลื่อนดูความทรงจำที่คุณหวงแหนที่สุด เพิ่มรูปภาพ บันทึกย่อ และสถานที่ในไทม์ไลน์ที่เติบโตไปพร้อมกับความสัมพันธ์ของคุณ",
    showcase2Title: "จดหมายสำหรับอนาคต",
    showcase2Desc: "เขียนความในใจและล็อคไว้จนถึงวันพิเศษ แคปซูลเวลาดิจิทัลสำหรับเซอร์ไพรส์วันครบรอบ",
    showcase3Title: "ของขวัญเล็กๆ รอยยิ้มที่ยิ่งใหญ่",
    showcase3Desc: "สร้างคูปองความรักที่กำหนดเองและแลกเป็นความช่วยเหลือที่น่ารัก เช่น นวดหลังฟรี",
    footerText: "สร้างสรรค์ด้วยความรัก"
  },
  zh: {
    signIn: "登录",
    getStarted: "注册",
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
    showcase1Title: "你们的爱情故事，被美好地记录下来。",
    showcase1Desc: "滚动查看你们最珍贵的记忆。在共享的时间轴上添加照片、笔记和地点。",
    showcase2Title: "写给未来的信。",
    showcase2Desc: "写下你的心声，并锁定到未来的特别日期。一个用于周年惊喜的数字时间胶囊。",
    showcase3Title: "小小的礼物，大大的微笑。",
    showcase3Desc: "创建定制在爱情优惠券并用它们兑换可爱的请求，比如背部按摩。",
    footerText: "用爱精心打造。"
  },
  ja: {
    signIn: "ログイン",
    getStarted: "登録する",
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
    showcase1Title: "美しく記録された愛の物語。",
    showcase1Desc: "大切な思い出を振り返りましょう。写真、メモ、場所を共有タイムラインに追加します。",
    showcase2Title: "未来への手紙。",
    showcase2Desc: "心を込めて書き、特別な日までロックします。記念日のサプライズのためのタイムカプセル。",
    showcase3Title: "小さな贈り物、大きな笑顔。",
    showcase3Desc: "カスタムクーポンを作成して、背中のマッサージなどのかわいいお願いと引き換えましょう。",
    footerText: "愛を込めて作成。"
  },
  ko: {
    signIn: "로그인",
    getStarted: "가입하기",
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
    showcase1Title: "아름답게 기록된 여러분의 사랑 이야기.",
    showcase1Desc: "소중한 추억들을 스크롤해 보세요. 공유된 타임라인에 사진, 메모, 장소를 추가하세요.",
    showcase2Title: "미래를 위한 편지.",
    showcase2Desc: "진심을 담아 쓰고 특별한 날까지 잠가두세요. 기념일 서프라이즈를 위한 디지털 타임캡슐.",
    showcase3Title: "작은 선물, 큰 미소.",
    showcase3Desc: "맞춤형 사랑 쿠폰을 만들어 등 마사지 같은 귀여운 부탁으로 교환해 보세요.",
    footerText: "사랑을 담아 만들었습니다."
  },
  es: {
    signIn: "Iniciar sesión",
    getStarted: "Registrarse",
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
    showcase1Title: "Su historia de amor, bellamente documentada.",
    showcase1Desc: "Desplázate por sus recuerdos más preciados. Agreguen fotos y notas a una línea de tiempo compartida.",
    showcase2Title: "Cartas para el futuro.",
    showcase2Desc: "Escribe con el corazón y bloquéalo hasta una fecha especial. Una cápsula del tiempo para sorprender.",
    showcase3Title: "Pequeños regalos, grandes sonrisas.",
    showcase3Desc: "Crea cupones de amor personalizados y canjéalos por lindos favores, como un masaje.",
    footerText: "Hecho con amor."
  },
  fr: {
    signIn: "Se connecter",
    getStarted: "S'inscrire",
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
    showcase1Title: "Votre histoire d'amour, joliment documentée.",
    showcase1Desc: "Faites défiler vos souvenirs les plus chers. Ajoutez des photos, des notes et des lieux.",
    showcase2Title: "Des lettres pour l'avenir.",
    showcase2Desc: "Écrivez de tout votre cœur et verrouillez-le jusqu'à une date spéciale. Une capsule temporelle.",
    showcase3Title: "Petits cadeaux, grands sourires.",
    showcase3Desc: "Créez des coupons d'amour personnalisés et échangez-les contre de jolies faveurs.",
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

        {/* Visual Showcase 1: Timeline */}
        <div className="w-full max-w-6xl mb-32 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="flex-1 space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-white text-3xl shadow-lg shadow-pink-500/30 mb-2">
              📸
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900" style={{ fontFamily: customTitleFont }}>{t.showcase1Title}</h2>
            <p className="text-xl text-gray-600 leading-relaxed">{t.showcase1Desc}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full max-w-md relative"
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-rose-200 to-pink-100 rounded-[3rem] blur-3xl opacity-50 -z-10"></div>
             <div className="w-full aspect-[9/16] rounded-3xl overflow-hidden border border-white/60 shadow-[0_30px_60px_-15px_rgba(236,72,153,0.3)] bg-white/40 backdrop-blur-xl flex flex-col relative p-4" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
                {/* Mock Timeline UI */}
                <div className="absolute left-8 top-10 bottom-10 w-1 bg-gradient-to-b from-pink-300 to-rose-300 rounded-full opacity-50 z-0"></div>
                <div className="flex-1 overflow-hidden z-10 space-y-6 pt-4">
                  {[
                    { title: "First Date at the Park", sub: "Oct 12, 2023", icon: "🌳", desc: "We talked for hours on the bench under the big oak tree.", imgCount: 0 },
                    { title: "Our Anniversary Trip", sub: "Feb 14, 2024", icon: "✈️", desc: "The sunset over the ocean was breathtaking!", imgCount: 4 },
                    { title: "Adopted Nari!", sub: "Mar 1, 2024", icon: "🐾", desc: "Welcome to our family, little one 🐕", imgCount: 2 }
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.2 }}
                      className="ml-10 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-sm relative group"
                    >
                      <div className="absolute -left-10 top-6 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-pink-400 flex items-center justify-center text-xs shadow-md z-20"></div>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-pink-100 flex-shrink-0 flex items-center justify-center text-2xl mt-1">{item.icon}</div>
                        <div className="flex-1 w-full">
                          <h4 className="font-bold text-gray-800 leading-tight">{item.title}</h4>
                          <p className="text-[10px] text-pink-500 font-bold mb-1 uppercase tracking-wide">{item.sub}</p>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.desc}</p>
                          
                          {item.imgCount > 0 && (
                            <div className="flex gap-2 mb-2">
                               <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-100 animate-pulse">
                                   <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-rose-50"></div>
                               </div>
                               {item.imgCount > 1 && (
                                   <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden relative border border-gray-100 flex items-center justify-center group">
                                     <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-rose-50 opacity-50"></div>
                                     <span className="text-xs font-bold text-gray-500 z-10">+{item.imgCount - 1}</span>
                                   </div>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
             </div>
          </motion.div>
        </div>

        {/* Visual Showcase 2: Letters */}
        <div className="w-full max-w-6xl mb-32 flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full relative"
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-200 to-pink-200 rounded-[3rem] blur-3xl opacity-50 -z-10"></div>
             <div className="w-full h-80 md:h-96 rounded-3xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(217,70,239,0.3)] bg-white/40 backdrop-blur-xl flex items-center justify-center relative p-8 overflow-hidden" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
                {/* Mock Letters UI */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute transform -rotate-6 lg:left-10 bg-white shadow-xl rounded-xl p-6 border-t-8 border-pink-400 w-64 max-w-[80%] z-20 hidden md:block"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl">💝</span>
                    <span className="text-xs font-bold text-pink-500 bg-pink-100 px-2 py-1 rounded-md">Unlocks in 3 days</span>
                  </div>
                  <div className="space-y-2 opacity-50 blur-[2px] select-none">
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                    <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-2 bg-gray-200 rounded w-4/6"></div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-gray-700 text-center">To my love...</p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute transform rotate-6 lg:right-10 bg-[#fff0f5] shadow-lg rounded-xl p-6 border border-pink-200 w-64 max-w-[80%] z-10"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl">💌</span>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-100 px-2 py-1 rounded-md">Unlocked!</span>
                  </div>
                  <p className="text-sm text-gray-700 italic border-l-2 border-pink-300 pl-3">"I can't wait for our trip next month. Thinking of you always."</p>
                </motion.div>
             </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="flex-1 space-y-6 text-center lg:text-left lg:pl-10"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white text-3xl shadow-lg shadow-fuchsia-500/30 mb-2">
              💌
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900" style={{ fontFamily: customTitleFont }}>{t.showcase2Title}</h2>
            <p className="text-xl text-gray-600 leading-relaxed">{t.showcase2Desc}</p>
          </motion.div>
        </div>

        {/* Visual Showcase 3: Coupons */}
        <div className="w-full max-w-6xl mb-32 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="flex-1 space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-fuchsia-500 text-white text-3xl shadow-lg shadow-purple-500/30 mb-2">
              🎟️
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900" style={{ fontFamily: customTitleFont }}>{t.showcase3Title}</h2>
            <p className="text-xl text-gray-600 leading-relaxed">{t.showcase3Desc}</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full relative"
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-purple-200 to-fuchsia-100 rounded-[3rem] blur-3xl opacity-50 -z-10"></div>
             <div className="w-full h-80 md:h-96 rounded-3xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(168,85,247,0.3)] bg-white/40 backdrop-blur-xl flex flex-col justify-center gap-4 p-8" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
                {/* Mock Coupons UI */}
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: -2 }}
                  className="w-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 shadow-md rounded-xl p-4 flex items-center cursor-pointer relative overflow-hidden group"
                >
                  <div className="absolute -left-4 w-8 h-8 rounded-full bg-white/40 blur-sm"></div>
                  <div className="absolute -right-4 w-8 h-8 rounded-full bg-white/40 blur-sm"></div>
                  <div className="text-4xl px-4 border-r-2 border-dashed border-orange-300">🍿</div>
                  <div className="px-4 flex-1">
                    <h4 className="font-bold text-orange-800 text-lg">Movie Choice</h4>
                    <p className="text-sm text-orange-600">Winner picks the movie tonight!</p>
                  </div>
                  <div className="px-4 text-orange-800 font-bold opacity-0 lg:group-hover:opacity-100 transition-opacity">Redeem</div>
                </motion.div>

                <motion.div 
                   whileHover={{ scale: 1.05, rotate: 2 }}
                   className="w-full bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 shadow-md rounded-xl p-4 flex items-center cursor-pointer relative overflow-hidden group ml-0 lg:ml-4"
                >
                  <div className="absolute -left-4 w-8 h-8 rounded-full bg-white/40 blur-sm"></div>
                  <div className="absolute -right-4 w-8 h-8 rounded-full bg-white/40 blur-sm"></div>
                  <div className="text-4xl px-4 border-r-2 border-dashed border-blue-300">💆</div>
                  <div className="px-4 flex-1">
                    <h4 className="font-bold text-blue-800 text-lg">Back Massage</h4>
                    <p className="text-sm text-blue-600">Good for one 15-minute massage</p>
                  </div>
                  <div className="px-4 text-blue-800 font-bold opacity-0 lg:group-hover:opacity-100 transition-opacity">Redeem</div>
                </motion.div>
             </div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <section className="w-full max-w-6xl mb-32 mt-12">
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
            const status = config.SDK_CLIENT_ID === 'MISSING' ? '❌ ERROR' : '✅ CONFIGURED';
            alert('🔍 AppKit Status: ' + status);
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
