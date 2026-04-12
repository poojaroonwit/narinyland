"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface Coupon {
  id: string;
  title: string;
  emoji: string;
  desc: string;
  color: string;
  expiry?: string;
  for?: string;
  isRedeemed?: boolean;
  points?: number;
}

type Partners = Record<string, { name: string; avatar: string }>;

interface LoveCouponsProps {
  coupons: Coupon[];
  partners?: Partners;
  onRedeem?: (id: string) => void; 
  onDelete?: (id: string) => void;
  onAdd?: (data: any) => void;
}

// ─── Sub-Components ──────────────────────────────────────────────────

const CouponCard: React.FC<{ 
  coupon: Coupon; 
  idx: number; 
  isRedeemed: boolean; 
  partners?: Partners;
  onCardClick: (id: string, currentlyRedeemed: boolean) => void;
  isAnimating?: boolean;
}> = ({ coupon, idx, isRedeemed, partners, onCardClick, isAnimating }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 400, damping: 40 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 400, damping: 40 });
  const shineX = useTransform(x, [-100, 100], [-300, 300]);
  const shineOpacity = useTransform(x, [-100, 100], [0, 0.4]);

  function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    x.set(mouseX - centerX);
    y.set(mouseY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isAnimating ? [1, 0.95, 1.05, 1] : 1,
      }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      exit={{ opacity: 0, scale: 0.9 }}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      className={`relative group select-none ${isRedeemed ? 'cursor-default' : 'cursor-pointer'}`}
      style={{ perspective: 1000 }}
    >
      <motion.div 
        style={{ 
          rotateX: isRedeemed ? 0 : rotateX, 
          rotateY: isRedeemed ? 0 : rotateY,
          transformStyle: "preserve-3d"
        }}
        onClick={() => onCardClick(coupon.id, isRedeemed)}
        className={`
          relative flex h-32 w-full overflow-hidden rounded-clay shadow-sm 
          transition-all duration-700 bg-white/60 border border-white/20 backdrop-blur-md
          ${isRedeemed ? 'opacity-40 grayscale' : 'hover:shadow-2xl hover:border-black/5'}
        `}
      >
        {/* Holographic Overlays */}
        {!isRedeemed && (
          <motion.div 
            style={{ translateX: shineX, opacity: shineOpacity }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-30deg] pointer-events-none z-10"
          />
        )}

        {/* Left Stub */}
        <div className={`
          w-24 md:w-28 flex items-center justify-center text-4xl bg-black transition-all duration-700 relative overflow-hidden
          ${isRedeemed ? 'bg-black/20' : 'group-hover:scale-110'}
        `}>
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          <span className="drop-shadow-2xl z-10">{coupon.emoji}</span>
          
          {/* Ticket Perforation Mock */}
          <div className="absolute top-0 bottom-0 -right-[6px] w-3 flex flex-col justify-around z-20">
             {[...Array(6)].map((_, i) => (
                <div key={i} className="w-3 h-3 bg-white/10 rounded-full" />
             ))}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col justify-center px-8 md:px-10 py-6 relative">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-black text-black uppercase tracking-[0.1em]">{coupon.title}</h3>
            {coupon.points && coupon.points > 0 && (
               <div className="text-[9px] font-black text-black/30 tracking-[0.2em]">
                 +{coupon.points} PTS
               </div>
            )}
          </div>
          <p className="text-[10px] text-black/40 font-black uppercase tracking-[0.1em] leading-tight line-clamp-2 max-w-[80%]">{coupon.desc}</p>
          
          <div className="mt-auto flex items-center justify-between">
             <span className="text-[8px] font-black text-black/20 uppercase tracking-[0.3em]">
               {coupon.expiry ? `EXP ${coupon.expiry}` : "PERMANENT"}
             </span>
             <span className="text-[8px] font-black text-black/10 uppercase tracking-[0.2em] font-mono">
                #{idx + 101}
             </span>
          </div>

          {isRedeemed && (
            <motion.div 
               initial={{ scale: 2, opacity: 0, rotate: -20 }}
               animate={{ scale: 1, opacity: 1, rotate: -15 }}
               className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white/20 backdrop-blur-[2px] z-30"
            >
               <div className="border-2 border-black/10 px-4 py-1 rounded-pill rotate-[-15deg]">
                  <span className="text-black/20 font-black text-xs uppercase tracking-[0.4em] font-geist">REDEEMED</span>
               </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const AddButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[90] px-8 py-4 rounded-pill bg-black text-white shadow-2xl flex items-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] border-none font-geist"
    >
      <i className="fas fa-plus"></i>
      ADD NEW TICKET
    </motion.button>
  );
};

const LoveCoupons: React.FC<LoveCouponsProps> = ({ coupons, partners, onRedeem, onDelete, onAdd }) => {
  const partnerEntries = Object.entries(partners || {});
  const firstPartnerId = partnerEntries[0]?.[0] || 'partner1';
  
  const [activeTab, setActiveTab] = useState<string>(firstPartnerId);
  const [statusTab, setStatusTab] = useState<'available' | 'redeemed'>('available');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [animatingRedeemId, setAnimatingRedeemId] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [newCoupon, setNewCoupon] = useState({
    title: '',
    emoji: '🎁',
    desc: '',
    points: 0,
    forPartner: firstPartnerId,
    color: 'from-black to-charcoal'
  });

  const handleCardClick = (id: string, currentlyRedeemed: boolean) => {
    if (currentlyRedeemed) return;
    const coupon = coupons.find(c => c.id === id);
    if (coupon) setSelectedCoupon(coupon);
  };

  const confirmRedeem = async () => {
    if (selectedCoupon && onRedeem) {
      const targetId = selectedCoupon.id;
      setIsRedeeming(true);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onRedeem(targetId);
      setAnimatingRedeemId(targetId);
      
      setSelectedCoupon(null);
      setIsRedeeming(false);
      setStatusTab('redeemed');
      
      setTimeout(() => setAnimatingRedeemId(null), 2000);
    }
  };
  
  const partnerCoupons = coupons.filter(c => !c.for || c.for === activeTab);
  const filteredCoupons = partnerCoupons.filter(c => {
    const isRedeemed = !!c.isRedeemed;
    return statusTab === 'redeemed' ? isRedeemed : !isRedeemed;
  });

  return (
    <div className="w-full max-w-6xl mx-auto pt-16 pb-32 px-6 font-geist">
      <div className="text-center mb-16">
        <h2 className="text-[10px] font-black text-black opacity-20 uppercase tracking-[0.5em] mb-4">GIFT REPOSITORY</h2>
        <h1 className="text-4xl font-black text-black uppercase tracking-tight mb-6">LOVE TICKETS</h1>
        <div className="w-12 h-1 bg-black mx-auto mb-12"></div>
      </div>

      {/* Partner Toggle */}
      <div className="flex justify-center mb-12">
        <div className="flex bg-black/5 p-2 rounded-clay backdrop-blur-md border border-black/5 overflow-x-auto max-w-full">
          {partnerEntries.map(([id, p]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-8 py-4 rounded-xl text-[10px] font-black transition-all uppercase tracking-[0.2em] flex items-center gap-3 whitespace-nowrap ${
                activeTab === id ? 'bg-white shadow-xl text-black scale-105' : 'text-black/20 hover:text-black/40'
              }`}
            >
              {p.avatar} {p.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex justify-center mb-16 gap-12">
          <button 
            onClick={() => setStatusTab('available')}
            className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${
              statusTab === 'available' ? 'text-black' : 'text-black/10 hover:text-black/30'
            }`}
          >
            AVAILABLE 
            {statusTab === 'available' && <motion.div layoutId="statusUnderline" className="absolute -bottom-4 left-0 right-0 h-1 bg-black" />}
          </button>
          <button 
            onClick={() => setStatusTab('redeemed')}
            className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${
              statusTab === 'redeemed' ? 'text-black' : 'text-black/10 hover:text-black/30'
            }`}
          >
            HISTORY
            {statusTab === 'redeemed' && <motion.div layoutId="statusUnderline" className="absolute -bottom-4 left-0 right-0 h-1 bg-black" />}
          </button>
      </div>

      <div className="min-h-[400px] relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {statusTab === 'available' && <AddButton onClick={() => setIsAdding(true)} />}
          
          <AnimatePresence mode="popLayout">
            {filteredCoupons.map((coupon, idx) => (
              <CouponCard 
                key={coupon.id}
                coupon={coupon}
                idx={idx}
                isRedeemed={!!coupon.isRedeemed}
                partners={partners}
                onCardClick={handleCardClick}
                isAnimating={animatingRedeemId === coupon.id}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredCoupons.length === 0 && (
           <div className="text-center py-32 opacity-20">
             <p className="text-[10px] font-black uppercase tracking-[0.5em]">
                NO {statusTab.toUpperCase()} TICKETS RECORDED
             </p>
           </div>
        )}
      </div>

      {/* Detailed Ticket Modal */}
      <AnimatePresence>
        {selectedCoupon && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCoupon(null)}
              className="absolute inset-0 bg-white/80 backdrop-blur-2xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-sm bg-black rounded-clay shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              {/* Header */}
              <div className="h-48 bg-white/5 flex items-center justify-center relative">
                <div className="text-7xl drop-shadow-2xl">{selectedCoupon.emoji}</div>
                <div className="absolute top-6 left-6 text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">TICKET AUTHENTIC</div>
                <div className="absolute bottom-6 left-6 text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">#{selectedCoupon.id.slice(0,8)}</div>
              </div>

              {/* Content Section */}
              <div className="p-10 text-center space-y-8">
                <div>
                   <h3 className="text-xl font-black text-white uppercase tracking-[0.1em] mb-4">{selectedCoupon.title}</h3>
                   <div className="flex justify-center gap-4">
                     <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] border border-white/10 px-3 py-1 rounded-pill">
                       FOR {partners?.[selectedCoupon.for || '']?.name.toUpperCase() || 'PARTNER'}
                     </span>
                     {selectedCoupon.points && selectedCoupon.points > 0 && (
                        <span className="text-[9px] font-black text-white px-3 py-1 rounded-pill bg-white/10 tracking-[0.2em]">
                          +{selectedCoupon.points} PTS
                        </span>
                     )}
                   </div>
                </div>

                <p className="text-white/50 text-[11px] font-bold leading-loose uppercase tracking-[0.1em] border-t border-b border-white/5 py-8 italic font-geist">
                   "{selectedCoupon.desc}"
                </p>

                <div className="space-y-4">
                  <button
                    onClick={confirmRedeem}
                    disabled={isRedeeming}
                    className={`w-full py-5 rounded-pill font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${isRedeeming ? 'bg-white/10 text-white/30 shadow-none' : 'bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)]'}`}
                  >
                    {isRedeeming ? 'VALIDATING...' : 'EXECUTE REDEMPTION'}
                  </button>
                  
                  <div className="flex flex-col gap-4 pt-4">
                    <button
                      onClick={() => setSelectedCoupon(null)}
                      className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors"
                    >
                      ABORT ACTION
                    </button>
                    <button
                      onClick={() => {
                        if (onDelete && selectedCoupon) {
                          onDelete(selectedCoupon.id);
                          setSelectedCoupon(null);
                        }
                      }}
                      className="text-[9px] font-black text-red-900 uppercase tracking-[0.3em] hover:text-red-500 transition-colors"
                    >
                      VOID TICKET
                    </button>
                  </div>
                </div>
              </div>

              {/* Redeemed Stamp Overlay for Modal */}
              <AnimatePresence>
                {isRedeeming && (
                  <motion.div 
                    initial={{ scale: 3, opacity: 0, rotate: -30 }}
                    animate={{ scale: 1, opacity: 1, rotate: -15 }}
                    className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-md"
                  >
                    <div className="border border-white/20 w-48 h-48 rounded-full flex items-center justify-center flex-col rotate-[-15deg]">
                      <span className="text-white font-black text-xl uppercase tracking-[0.5em] font-geist">REDEEMED</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setIsAdding(false)}
               className="absolute inset-0 bg-white/90 backdrop-blur-2xl"
            />
            
            <motion.div
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 50 }}
               className="relative w-full max-w-sm bg-white rounded-clay shadow-2xl p-10 border border-black/5"
            >
               <h3 className="text-sm font-black text-black mb-10 flex items-center gap-4 uppercase tracking-[0.3em]">
                 <i className="fas fa-plus opacity-30"></i> ISSUE NEW TICKET
               </h3>

               <div className="space-y-8">
                  <div className="flex gap-4">
                     <div className="w-20">
                        <label className="text-[10px] uppercase font-black text-black/20 tracking-[0.2em] mb-3 block">EMOJI</label>
                        <input 
                           type="text" 
                           value={newCoupon.emoji} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, emoji: e.target.value }))}
                           className="w-full text-center bg-black/5 rounded-xl p-4 text-2xl outline-none focus:bg-white focus:shadow-xl transition-all"
                        />
                     </div>
                     <div className="flex-1">
                        <label className="text-[10px] uppercase font-black text-black/20 tracking-[0.2em] mb-3 block">TITLE</label>
                        <input 
                           type="text" 
                           placeholder="UNLIMITED HUGS"
                           value={newCoupon.title} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, title: e.target.value }))}
                           className="w-full bg-black/5 rounded-xl p-4 text-xs font-black uppercase tracking-[0.1em] outline-none focus:bg-white focus:shadow-xl transition-all"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] uppercase font-black text-black/20 tracking-[0.2em] mb-3 block">DESCRIPTION</label>
                      <textarea 
                        placeholder="SPECIFY TERMS..."
                        value={newCoupon.desc} 
                        onChange={e => setNewCoupon(prev => ({ ...prev, desc: e.target.value }))}
                        className="w-full bg-black/5 rounded-xl p-4 text-[10px] font-bold uppercase tracking-[0.1em] outline-none focus:bg-white focus:shadow-xl transition-all min-h-[120px] resize-none"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] uppercase font-black text-black/20 tracking-[0.2em] mb-3 block">POINTS</label>
                        <input 
                           type="number" 
                           value={newCoupon.points} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                           className="w-full bg-black/5 rounded-xl p-4 text-xs font-black outline-none focus:bg-white focus:shadow-xl transition-all"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] uppercase font-black text-black/20 tracking-[0.2em] mb-3 block">TARGET</label>
                        <select 
                           value={newCoupon.forPartner} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, forPartner: e.target.value }))}
                           className="w-full bg-black/5 rounded-xl p-4 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:bg-white focus:shadow-xl transition-all appearance-none"
                        >
                           {partnerEntries.map(([id, p]) => (
                             <option key={id} value={id}>{p.name.toUpperCase()}</option>
                           ))}
                        </select>
                     </div>
                  </div>

                  <div className="pt-6 space-y-4">
                     <button
                        onClick={() => {
                           if (!newCoupon.title || !newCoupon.emoji) return alert("REQUIRED: TITLE + EMOJI");
                           if (onAdd) onAdd(newCoupon);
                           setIsAdding(false);
                           setNewCoupon({ title: '', emoji: '🎁', desc: '', points: 0, forPartner: firstPartnerId, color: 'from-black to-charcoal' });
                        }}
                        className="w-full py-5 rounded-pill font-black text-[10px] uppercase tracking-[0.3em] bg-black text-white shadow-2xl hover:bg-black/80 transition-all font-geist"
                     >
                        FINALIZE TICKET
                     </button>
                     <button
                        onClick={() => setIsAdding(false)}
                        className="w-full py-2 text-[9px] font-black text-black/20 uppercase tracking-[0.3em] hover:text-black transition-colors"
                     >
                        ABORT
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoveCoupons;
