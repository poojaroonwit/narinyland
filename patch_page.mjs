import fs from 'fs';

let content = fs.readFileSync('app/login/page.tsx', 'utf8');

const newKeys = {
  en: `    showcase1Title: "Your love story, beautifully documented.",
    showcase1Desc: "Scroll through your most cherished memories. Add photos, notes, and locations to a shared timeline that grows with your relationship.",
    showcase2Title: "Letters for the future.",
    showcase2Desc: "Write your heart out and lock it until a special date. A digital time capsule for anniversary surprises.",
    showcase3Title: "Little gifts, big smiles.",
    showcase3Desc: "Create custom love coupons and redeem them for cute favors, like a back massage.",`,
  th: `    showcase1Title: "เรื่องราวความรักของคุณที่ถูกบันทึกไว้อย่างสวยงาม",
    showcase1Desc: "เลื่อนดูความทรงจำที่คุณหวงแหนที่สุด เพิ่มรูปภาพ บันทึกย่อ และสถานที่ในไทม์ไลน์ที่เติบโตไปพร้อมกับความสัมพันธ์ของคุณ",
    showcase2Title: "จดหมายสำหรับอนาคต",
    showcase2Desc: "เขียนความในใจและล็อคไว้จนถึงวันพิเศษ แคปซูลเวลาดิจิทัลสำหรับเซอร์ไพรส์วันครบรอบ",
    showcase3Title: "ของขวัญเล็กๆ รอยยิ้มที่ยิ่งใหญ่",
    showcase3Desc: "สร้างคูปองความรักที่กำหนดเองและแลกเป็นความช่วยเหลือที่น่ารัก เช่น นวดหลังฟรี",`,
  zh: `    showcase1Title: "你们的爱情故事，被美好地记录下来。",
    showcase1Desc: "滚动查看你们最珍贵的记忆。在共享的时间轴上添加照片、笔记和地点。",
    showcase2Title: "写给未来的信。",
    showcase2Desc: "写下你的心声，并锁定到未来的特别日期。一个用于周年惊喜的数字时间胶囊。",
    showcase3Title: "小小的礼物，大大的微笑。",
    showcase3Desc: "创建定制在爱情优惠券并用它们兑换可爱的请求，比如背部按摩。",`,
  ja: `    showcase1Title: "美しく記録された愛の物語。",
    showcase1Desc: "大切な思い出を振り返りましょう。写真、メモ、場所を共有タイムラインに追加します。",
    showcase2Title: "未来への手紙。",
    showcase2Desc: "心を込めて書き、特別な日までロックします。記念日のサプライズのためのタイムカプセル。",
    showcase3Title: "小さな贈り物、大きな笑顔。",
    showcase3Desc: "カスタムクーポンを作成して、背中のマッサージなどのかわいいお願いと引き換えましょう。",`,
  ko: `    showcase1Title: "아름답게 기록된 여러분의 사랑 이야기.",
    showcase1Desc: "소중한 추억들을 스크롤해 보세요. 공유된 타임라인에 사진, 메모, 장소를 추가하세요.",
    showcase2Title: "미래를 위한 편지.",
    showcase2Desc: "진심을 담아 쓰고 특별한 날까지 잠가두세요. 기념일 서프라이즈를 위한 디지털 타임캡슐.",
    showcase3Title: "작은 선물, 큰 미소.",
    showcase3Desc: "맞춤형 사랑 쿠폰을 만들어 등 마사지 같은 귀여운 부탁으로 교환해 보세요.",`,
  es: `    showcase1Title: "Su historia de amor, bellamente documentada.",
    showcase1Desc: "Desplázate por sus recuerdos más preciados. Agreguen fotos y notas a una línea de tiempo compartida.",
    showcase2Title: "Cartas para el futuro.",
    showcase2Desc: "Escribe con el corazón y bloquéalo hasta una fecha especial. Una cápsula del tiempo para sorprender.",
    showcase3Title: "Pequeños regalos, grandes sonrisas.",
    showcase3Desc: "Crea cupones de amor personalizados y canjéalos por lindos favores, como un masaje.",`,
  fr: `    showcase1Title: "Votre histoire d'amour, joliment documentée.",
    showcase1Desc: "Faites défiler vos souvenirs les plus chers. Ajoutez des photos, des notes et des lieux.",
    showcase2Title: "Des lettres pour l'avenir.",
    showcase2Desc: "Écrivez de tout votre cœur et verrouillez-le jusqu'à une date spéciale. Une capsule temporelle.",
    showcase3Title: "Petits cadeaux, grands sourires.",
    showcase3Desc: "Créez des coupons d'amour personnalisés et échangez-les contre de jolies faveurs.",`
};

for (const [lang, keys] of Object.entries(newKeys)) {
  const match = new RegExp(\`(\${lang}:\\\\s*{[\\\\s\\\\S]*?)(footerText:.*?\\\\n)(\\\\s*})\`, 'g');
  content = content.replace(match, \`\$1\$2\${keys}\\n\$3\`);
}

const oldShowcase = \`        {/* Visual Showcase (Glassmorphism Mockup) */}
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
        </motion.div>\`;

const newShowcases = \`        {/* Visual Showcase 1: Timeline */}
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
                <div className="flex-1 overflow-visible z-10 space-y-6 pt-4">
                  {[
                    { title: "First Date at the Park", sub: "Oct 12, 2023", icon: "🌳" },
                    { title: "Our Anniversary Trip", sub: "Feb 14, 2024", icon: "✈️" },
                    { title: "Adopted Nari!", sub: "Mar 1, 2024", icon: "🐾" }
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.2 }}
                      className="ml-10 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-sm relative group"
                    >
                      <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-pink-400 flex items-center justify-center text-xs shadow-md z-20"></div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-2xl">{item.icon}</div>
                        <div>
                          <h4 className="font-bold text-gray-800">{item.title}</h4>
                          <p className="text-sm text-pink-500 font-medium">{item.sub}</p>
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
        </div>\`;

content = content.replace(oldShowcase, newShowcases);

fs.writeFileSync('app/login/page.tsx', content);
console.log('Successfully patched login page!');
