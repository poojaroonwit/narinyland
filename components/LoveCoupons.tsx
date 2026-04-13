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
          relative flex h-36 w-full border transition-all duration-700 
          ${isRedeemed ? 'bg-black/[0.02] border-black/5 opacity-40 grayscale' : 'bg-white border-black/10 hover:border-black hover:shadow-2xl'}
        `}
      >
        {/* Holographic Overlays */}
        {!isRedeemed && (
          <motion.div 
            style={{ translateX: shineX, opacity: shineOpacity }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.03] to-transparent skew-x-[-30deg] pointer-events-none z-10"
          />
        )}
 
        {/* Left Stub */}
        <div className={`
          w-24 md:w-32 flex items-center justify-center text-5xl bg-black relative overflow-hidden transition-all duration-700
          ${isRedeemed ? 'bg-black/10' : ''}
        `}>
          <div className="absolute inset-0 bg-white/5 opacity-20 pointer-events-none" />
          <span className="z-10 grayscale brightness-150">{coupon.emoji}</span>
          
          {/* Ticket Perforation Mock - Geometric */}
          <div className="absolute top-0 bottom-0 -right-[4px] w-2 flex flex-col justify-between z-20 py-2">
             {[...Array(8)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white rounded-none" />
             ))}
          </div>
        </div>
 
        {/* Right Content */}
        <div className="flex-1 flex flex-col justify-center px-10 py-8 relative">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[12px] font-black text-black uppercase tracking-[0.2em]">{coupon.title}</h3>
            {coupon.points && coupon.points > 0 && (
               <div className="text-[9px] font-black text-black/10 tracking-[0.3em]">
                 +{coupon.points}_UNIT
               </div>
            )}
          </div>
          <p className="text-[10px] text-black/40 font-black uppercase tracking-[0.1em] leading-relaxed line-clamp-2 max-w-[90%]">{coupon.desc}</p>
          
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-black/5">
             <span className="text-[8px] font-black text-black/20 uppercase tracking-[0.4em]">
               VAL_PRD::{coupon.expiry ? coupon.expiry.toUpperCase() : "PERMANENT"}
             </span>
             <span className="text-[8px] font-black text-black/10 uppercase tracking-[0.2em] font-mono">
                ID_AUTH::{idx + 800}
             </span>
          </div>
 
          {isRedeemed && (
            <motion.div 
               initial={{ scale: 2, opacity: 0, rotate: -20 }}
               animate={{ scale: 1, opacity: 1, rotate: -15 }}
               className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/[0.05] backdrop-blur-[1px] z-30"
            >
               <div className="border border-black/20 px-6 py-2 rotate-[-15deg]">
                  <span className="text-black/30 font-black text-[11px] uppercase tracking-[0.6em] font-geist">_REDEEMED</span>
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
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[90] px-12 py-5 bg-black text-white shadow-[0_30px_60px_rgba(0,0,0,0.4)] flex items-center gap-6 font-black uppercase tracking-[0.4em] text-[10px] border-none font-geist"
    >
      <i className="fas fa-plus text-xs"></i>
      ISSUE_TICKET_REQUEST
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
      <div className="flex justify-center mb-16">
        <div className="flex bg-black/[0.02] border border-black/5 p-2 overflow-x-auto max-w-full">
          {partnerEntries.map(([id, p]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-10 py-5 text-[10px] font-black transition-all uppercase tracking-[0.3em] flex items-center gap-4 whitespace-nowrap ${
                activeTab === id ? 'bg-black text-white shadow-2xl' : 'text-black/20 hover:text-black/40'
              }`}
            >
              <span className="grayscale">{p.avatar}</span> {p.name.toUpperCase()}
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
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-md bg-black border border-white/5 shadow-[0_60px_120px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Header */}
              <div className="h-48 bg-white/5 flex items-center justify-center relative">
                <div className="text-7xl drop-shadow-2xl">{selectedCoupon.emoji}</div>
                <div className="absolute top-6 left-6 text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">TICKET AUTHENTIC</div>
                <div className="absolute bottom-6 left-6 text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">#{selectedCoupon.id.slice(0,8)}</div>
              </div>

              {/* Content Section */}
              <div className="p-12 text-center space-y-10">
                <div className="space-y-4">
                   <h3 className="text-2xl font-black text-white uppercase tracking-[0.15em]">{selectedCoupon.title}</h3>
                   <div className="flex justify-center gap-6">
                     <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] border border-white/10 px-4 py-2">
                       AUTH_TRGT::{partners?.[selectedCoupon.for || '']?.name.toUpperCase() || 'EXTERNAL'}
                     </span>
                     {selectedCoupon.points && selectedCoupon.points > 0 && (
                        <span className="text-[9px] font-black text-white px-4 py-2 bg-white/10 tracking-[0.4em]">
                          VAL::+{selectedCoupon.points}_PTS
                        </span>
                     )}
                   </div>
                </div>

                <p className="text-white/50 text-[11px] font-bold leading-loose uppercase tracking-[0.1em] border-t border-b border-white/5 py-8 italic font-geist">
                   "{selectedCoupon.desc}"
                </p>

                <div className="space-y-6">
                  <button
                    onClick={confirmRedeem}
                    disabled={isRedeeming}
                    className={`w-full py-6 font-black text-[10px] uppercase tracking-[0.6em] transition-all active:scale-[0.98] flex items-center justify-center gap-4 ${isRedeeming ? 'bg-white/5 text-white/10' : 'bg-white text-black shadow-2xl hover:bg-neutral-200'}`}
                  >
                    {isRedeeming ? 'VALIDATING_PROTOCOL...' : 'EXECUTE_REDEMPTION'}
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
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="relative w-full max-w-md bg-white border border-black/5 shadow-2xl p-12"
            >
               <h3 className="text-[12px] font-black text-black mb-12 flex items-center gap-6 uppercase tracking-[0.4em]">
                 <span className="w-8 h-[1px] bg-black"></span> ISSUE_NEW_TICKET
               </h3>

               <div className="space-y-8">
                  <div className="flex gap-6">
                     <div className="w-24">
                        <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] mb-4 block">IDENTIFIER</label>
                        <input 
                           type="text" 
                           value={newCoupon.emoji} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, emoji: e.target.value }))}
                           className="w-full text-center bg-black/[0.02] border border-black/5 p-5 text-3xl outline-none focus:bg-white focus:border-black transition-all grayscale"
                        />
                     </div>
                     <div className="flex-1">
                        <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] mb-4 block">TITLE_DSGN</label>
                        <input 
                           type="text" 
                           placeholder="DESIGNATE_SERVICE..."
                           value={newCoupon.title} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, title: e.target.value }))}
                           className="w-full bg-black/[0.02] border border-black/5 p-5 text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:bg-white focus:border-black transition-all"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] mb-4 block">SPECIFICATIONS</label>
                      <textarea 
                        placeholder="ENTER_TERMS_AND_CONDITIONS..."
                        value={newCoupon.desc} 
                        onChange={e => setNewCoupon(prev => ({ ...prev, desc: e.target.value }))}
                        className="w-full bg-black/[0.02] border border-black/5 p-5 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:bg-white focus:border-black transition-all min-h-[140px] resize-none"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div>
                        <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] mb-4 block">VAL_PTS</label>
                        <input 
                           type="number" 
                           value={newCoupon.points} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                           className="w-full bg-black/[0.02] border border-black/5 p-5 text-[11px] font-black outline-none focus:bg-white focus:border-black transition-all"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] uppercase font-black text-black/20 tracking-[0.3em] mb-4 block">TARGET_ID</label>
                        <select 
                           value={newCoupon.forPartner} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, forPartner: e.target.value }))}
                           className="w-full bg-black/[0.02] border border-black/5 p-5 text-[10px] font-black uppercase tracking-[0.3em] outline-none focus:bg-white focus:border-black transition-all appearance-none"
                        >
                           {partnerEntries.map(([id, p]) => (
                             <option key={id} value={id}>{p.name.toUpperCase()}</option>
                           ))}
                        </select>
                     </div>
                  </div>

                  <div className="pt-8 space-y-4">
                     <button
                        onClick={() => {
                           if (!newCoupon.title || !newCoupon.emoji) return alert("REQUIRED: TITLE + IDENTIFIER");
                           if (onAdd) onAdd(newCoupon);
                           setIsAdding(false);
                           setNewCoupon({ title: '', emoji: '🎁', desc: '', points: 0, forPartner: firstPartnerId, color: 'from-black to-charcoal' });
                        }}
                        className="w-full py-6 font-black text-[10px] uppercase tracking-[0.6em] bg-black text-white shadow-2xl hover:bg-neutral-800 transition-all font-geist"
                     >
                        VALIDATE_AND_ISSUE
                     </button>
                     <button
                        onClick={() => setIsAdding(false)}
                        className="w-full py-2 text-[10px] font-black text-black/20 uppercase tracking-[0.4em] hover:text-black transition-colors"
                     >
                        TERMINATE_REQUEST
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
