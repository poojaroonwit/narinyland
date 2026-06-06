"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AddButton, CouponCard, PartnerAvatar } from './love-coupons/CouponChrome';
import { Coupon, CouponDraft, LoveCouponsProps } from './love-coupons/types';

const LoveCoupons: React.FC<LoveCouponsProps> = ({ coupons, partners, onRedeem, onDelete, onAdd }) => {
  const [activeTab, setActiveTab] = useState<'partner1' | 'partner2'>('partner1');
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
    forPartner: 'partner1' as 'partner1' | 'partner2',
    color: 'from-pink-400 to-rose-400'
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
      
      // Wait for stamp animation to complete on modal
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onRedeem(targetId);
      setAnimatingRedeemId(targetId);
      
      // Close modal
      setSelectedCoupon(null);
      setIsRedeeming(false);
      
      // Move to history
      setStatusTab('redeemed');
      
      // Clear secondary animation state after a delay
      setTimeout(() => setAnimatingRedeemId(null), 2000);
    }
  };
  
  // 1. Filter by Partner
  const partnerCoupons = coupons.filter(c => !c.for || c.for === activeTab);

  // 2. Filter by Status
  const filteredCoupons = partnerCoupons.filter(c => {
    const isRedeemed = !!c.isRedeemed;
    return statusTab === 'redeemed' ? isRedeemed : !isRedeemed;
  });

  const p1Name = partners?.partner1.name || 'Her';
  const p2Name = partners?.partner2.name || 'Him';

  return (
    <div className="w-full max-w-4xl mx-auto pt-2 pb-6 md:py-12 px-4">
      <div className="text-center mb-2 md:mb-8">
        <h2 className="font-pacifico text-xl md:text-3xl text-pink-500 mb-1 md:mb-2">Love Coupons</h2>
        <p className="text-[10px] md:text-base text-gray-500 font-quicksand">Select a recipient and view their rewards! ❤️</p>
      </div>

      <div className="flex justify-center mb-6 bg-white/50 p-1 rounded-full max-w-xs mx-auto backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('partner1')}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'partner1' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:text-pink-400'
          }`}
        >
          {partners?.partner1.avatar && (
            <PartnerAvatar avatar={partners.partner1.avatar} name={p1Name} />
          )}
          {p1Name}
        </button>
        <button
          onClick={() => setActiveTab('partner2')}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'partner2' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:text-blue-400'
          }`}
        >
          {partners?.partner2.avatar && (
            <PartnerAvatar avatar={partners.partner2.avatar} name={p2Name} />
          )}
          {p2Name}
        </button>
      </div>

      <div className="flex justify-center mb-10 gap-3">
          <button 
            onClick={() => setStatusTab('available')}
            className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
              statusTab === 'available' 
                ? 'bg-white text-pink-500 shadow-sm border-2 border-pink-200' 
                : 'bg-transparent text-gray-400 hover:text-pink-300'
            }`}
          >
            Available ({partnerCoupons.filter(c => !c.isRedeemed).length})
          </button>
          <button 
            onClick={() => setStatusTab('redeemed')}
            className={`px-5 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
              statusTab === 'redeemed' 
                ? 'bg-white text-gray-600 shadow-sm border-2 border-gray-200' 
                : 'bg-transparent text-gray-400 hover:text-gray-500'
            }`}
          >
            History ({partnerCoupons.filter(c => c.isRedeemed).length})
          </button>
      </div>

      <div className="min-h-[300px] relative pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statusTab === 'available' && <AddButton onClick={() => setIsAdding(true)} />}
          
          <AnimatePresence mode="popLayout">
            {filteredCoupons.map((coupon, idx) => (
              <CouponCard 
                key={coupon.id}
                coupon={coupon}
                idx={idx}
                isRedeemed={!!coupon.isRedeemed}
                onCardClick={handleCardClick}
                isAnimating={animatingRedeemId === coupon.id}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredCoupons.length === 0 && (
           <div className="text-center text-gray-400 py-16 px-4">
             <div className="text-5xl mb-4 opacity-50">{statusTab === 'available' ? '🎫' : '📁'}</div>
             <p className="font-bold">
                No {statusTab} coupons for {activeTab === 'partner1' ? p1Name : p2Name} yet!
             </p>
             {statusTab === 'available' && (
               <p className="text-xs mt-2 italic text-gray-400">Click the card above to create your first surprise! ✨</p>
             )}
           </div>
        )}
      </div>

      {/* Detailed Ticket Modal */}
      <AnimatePresence>
        {selectedCoupon && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCoupon(null)}
              className="absolute inset-0 bg-pink-900/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-md shadow-2xl overflow-hidden border-4 border-white"
            >
              {/* Top Section / Gradient Header */}
              <div className={`h-32 bg-gradient-to-br ${selectedCoupon.color} relative flex items-center justify-center`}>
                <div className="text-6xl drop-shadow-lg">{selectedCoupon.emoji}</div>
                {/* Perforation Circles (Decorative) */}
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-white rounded-full"></div>
                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-white rounded-full"></div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full border-b-4 border-dashed border-white/30"></div>
              </div>

              {/* Content Section */}
              <div className="p-8 text-center space-y-4">
                <div>
                   <h3 className="text-2xl font-black text-gray-800 mb-2">{selectedCoupon.title}</h3>
                   <div className="flex justify-center gap-2">
                     <span className="bg-pink-100 text-pink-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                       For {selectedCoupon.for === 'partner2' ? partners?.partner2.name : partners?.partner1.name}
                     </span>
                     {selectedCoupon.points && selectedCoupon.points > 0 && (
                        <span className="bg-yellow-100 text-yellow-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                          +{selectedCoupon.points?.toLocaleString()} Points
                        </span>
                     )}
                   </div>
                </div>

                <p className="text-gray-500 text-sm font-medium leading-relaxed italic">
                  &quot;{selectedCoupon.desc}&quot;
                </p>

                {selectedCoupon.expiry && (
                  <div className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] border-t pt-4">
                     Expires: {selectedCoupon.expiry}
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <button
                    onClick={confirmRedeem}
                    disabled={isRedeeming}
                    className={`w-full py-4 rounded-md font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-pink-100 transition-all hover:scale-[1.02] active:scale-95 ${isRedeeming ? 'bg-gray-400 opacity-50' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'}`}
                  >
                    {isRedeeming ? 'Redeeming...' : 'Redeem Now 🎟️'}
                  </button>
                  <div className="flex justify-center gap-6">
                    <button
                      onClick={() => setSelectedCoupon(null)}
                      className="py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                    >
                      Maybe Later
                    </button>
                    <button
                      onClick={() => {
                        if (onDelete && selectedCoupon) {
                          onDelete(selectedCoupon.id);
                          setSelectedCoupon(null);
                        }
                      }}
                      className="py-2 text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                    >
                      Delete Coupon
                    </button>
                  </div>
                </div>
              </div>

              {/* Redeemed Stamp Overlay for Modal */}
              <AnimatePresence>
                {isRedeeming && (
                  <motion.div 
                    initial={{ scale: 5, opacity: 0, rotate: -30 }}
                    animate={{ scale: 1, opacity: 1, rotate: -15 }}
                    className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                  >
                    <div className="border-8 border-red-500 w-64 h-64 rounded-full shadow-[0_0_40px_rgba(239,68,68,0.3)] bg-transparent mix-blend-multiply flex items-center justify-center flex-col">
                      <span className="text-red-500 font-black text-3xl md:text-4xl uppercase tracking-[0.2em] font-mono">REDEEMED</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Decorative Corner Stars */}
              <div className="absolute top-2 left-2 text-white/40 text-xs"><i className="fas fa-sparkles"></i></div>
              <div className="absolute top-2 right-2 text-white/40 text-xs"><i className="fas fa-sparkles"></i></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setIsAdding(false)}
               className="absolute inset-0 bg-pink-900/40 backdrop-blur-md"
            />
            
            <motion.div
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 50 }}
               className="relative w-full max-w-sm bg-white rounded-md shadow-2xl p-8 overflow-hidden"
            >
               <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                 <i className="fas fa-magic text-pink-500"></i> Create Coupon
               </h3>

               <div className="space-y-4">
                  <div className="flex gap-3">
                     <div className="w-20 shrink-0 flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Emoji</label>
                        <select
                           value={newCoupon.emoji}
                           onChange={e => setNewCoupon(prev => ({ ...prev, emoji: e.target.value }))}
                           className="w-full border-2 border-pink-50 rounded-md p-3 text-xl font-black focus:border-pink-200 outline-none bg-white cursor-pointer"
                        >
                           <option value="🎁">🎁</option>
                           <option value="💝">💝</option>
                           <option value="🌹">🌹</option>
                           <option value="🍽️">🍽️</option>
                           <option value="🎬">🎬</option>
                           <option value="🍕">🍕</option>
                           <option value="☕">☕</option>
                           <option value="🍰">🍰</option>
                           <option value="🍦">🍦</option>
                           <option value="🧋">🧋</option>
                           <option value="🍷">🍷</option>
                           <option value="🎮">🎮</option>
                           <option value="🎵">🎵</option>
                           <option value="💆">💆</option>
                           <option value="💅">💅</option>
                           <option value="🏖️">🏖️</option>
                           <option value="🛍️">🛍️</option>
                           <option value="🎟️">🎟️</option>
                           <option value="🤗">🤗</option>
                           <option value="💋">💋</option>
                           <option value="🌟">🌟</option>
                           <option value="❤️">❤️</option>
                        </select>
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Title</label>
                        <input
                           type="text"
                           placeholder="Unlimited Hugs"
                           value={newCoupon.title}
                           onChange={e => setNewCoupon(prev => ({ ...prev, title: e.target.value }))}
                           className="w-full border-2 border-pink-50 rounded-md p-3 text-base font-black focus:border-pink-200 outline-none placeholder:text-gray-300 transition-all"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col gap-1">
                     <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Description</label>
                      <textarea 
                        placeholder="Valid for one very long hug..."
                        value={newCoupon.desc} 
                        onChange={e => setNewCoupon(prev => ({ ...prev, desc: e.target.value }))}
                        className="w-full border-2 border-pink-50 rounded-md p-4 text-sm font-bold focus:border-pink-200 outline-none min-h-[100px] resize-none transition-all placeholder:text-gray-300"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Points</label>
                        <input 
                           type="number" 
                           value={newCoupon.points} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                           className="w-full border-2 border-pink-50 rounded-md p-4 text-base font-black focus:border-pink-200 outline-none transition-all"
                        />
                     </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">For</label>
                        <select 
                           value={newCoupon.forPartner} 
                           onChange={e => setNewCoupon(prev => ({ ...prev, forPartner: e.target.value as CouponDraft['forPartner'] }))}
                           className="w-full border-2 border-pink-50 rounded-md p-4 text-sm font-black uppercase tracking-widest focus:border-pink-200 outline-none bg-white transition-all"
                        >
                           <option value="partner1">{p1Name}</option>
                           <option value="partner2">{p2Name}</option>
                        </select>
                     </div>
                  </div>

                  <div className="pt-4 space-y-3">
                     <button
                        onClick={() => {
                           if (!newCoupon.title || !newCoupon.emoji) return alert("Please fill title and emoji");
                           if (onAdd) onAdd(newCoupon);
                           setIsAdding(false);
                           setNewCoupon({ title: '', emoji: '🎁', desc: '', points: 0, forPartner: 'partner1', color: 'from-pink-400 to-rose-400' });
                        }}
                        className="w-full py-4 rounded-md font-black text-xs uppercase tracking-[0.2em] bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xl shadow-pink-100 hover:scale-[1.02] active:scale-95 transition-all"
                     >
                        Create Ticket 🎟️
                     </button>
                     <button
                        onClick={() => setIsAdding(false)}
                        className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                     >
                        Cancel
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
