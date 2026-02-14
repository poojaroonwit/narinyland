"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface Partners {
  partner1: { name: string; avatar: string };
  partner2: { name: string; avatar: string };
}

interface LoveCouponsProps {
  coupons: Coupon[];
  partners?: Partners;
  onRedeem?: (id: string) => void;
}

const LoveCoupons: React.FC<LoveCouponsProps> = ({ coupons, partners, onRedeem }) => {
  const [activeTab, setActiveTab] = useState<'partner1' | 'partner2'>('partner1');
  const [statusTab, setStatusTab] = useState<'available' | 'redeemed'>('available');

  const handleRedeem = (id: string, currentlyRedeemed: boolean) => {
    if (currentlyRedeemed) return;
    if (onRedeem) onRedeem(id);
  };
  
  // 1. Filter by Partner
  const partnerCoupons = coupons.filter(c => {
    if (!c.for) return true;
    return c.for === activeTab;
  });

  // 2. Filter by Status
  const filteredCoupons = partnerCoupons.filter(c => {
    const isRedeemed = !!c.isRedeemed;
    return statusTab === 'redeemed' ? isRedeemed : !isRedeemed;
  });

  const p1Name = partners?.partner1.name || 'Her';
  const p2Name = partners?.partner2.name || 'Him';

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h2 className="font-pacifico text-3xl text-pink-500 mb-2">Love Coupons</h2>
        <p className="text-gray-500 font-quicksand">Select a recipient and view their rewards! ❤️</p>
      </div>

      {/* Main Recipient Tabs */}
      <div className="flex justify-center mb-6 bg-white/50 p-1 rounded-full max-w-xs mx-auto backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('partner1')}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
            activeTab === 'partner1' 
              ? 'bg-pink-500 text-white shadow-md' 
              : 'text-gray-500 hover:text-pink-400'
          }`}
        >
          {partners?.partner1.avatar} {p1Name}
        </button>
        <button
          onClick={() => setActiveTab('partner2')}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all ${
            activeTab === 'partner2' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'text-gray-500 hover:text-blue-400'
          }`}
        >
           {partners?.partner2.avatar} {p2Name}
        </button>
      </div>

      {/* Sub Status Tabs */}
      <div className="flex justify-center mb-10 gap-3">
          <button 
            onClick={() => setStatusTab('available')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              statusTab === 'available' 
                ? 'bg-white text-pink-500 shadow-sm border-2 border-pink-200' 
                : 'bg-transparent text-gray-400 hover:text-pink-300'
            }`}
          >
            Available ({partnerCoupons.filter(c => !c.isRedeemed).length})
          </button>
          <button 
            onClick={() => setStatusTab('redeemed')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              statusTab === 'redeemed' 
                ? 'bg-white text-gray-600 shadow-sm border-2 border-gray-200' 
                : 'bg-transparent text-gray-400 hover:text-gray-500'
            }`}
          >
            History ({partnerCoupons.filter(c => c.isRedeemed).length})
          </button>
      </div>

      <div className="min-h-[300px]">
        {filteredCoupons.length === 0 ? (
           <div className="text-center text-gray-400 py-16 border-2 border-dashed border-gray-200 rounded-3xl bg-white/30">
             <div className="text-5xl mb-4 opacity-50">{statusTab === 'available' ? '🎫' : '📁'}</div>
             <p className="font-bold">
                No {statusTab} coupons for {activeTab === 'partner1' ? p1Name : p2Name} yet!
             </p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredCoupons.map((coupon) => {
                const isRedeemed = !!coupon.isRedeemed;

                return (
                  <motion.div
                    key={coupon.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.03, rotate: isRedeemed ? 0 : [0, 1, -1, 0] }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleRedeem(coupon.id, isRedeemed)}
                    className={`relative group select-none ${isRedeemed ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {/* Ticket Container */}
                    <div className={`
                      relative flex h-32 w-full overflow-hidden rounded-xl shadow-md border-2 
                      transition-all duration-300
                      ${isRedeemed ? 'border-gray-300 opacity-60 grayscale-[0.8]' : 'border-white'}
                    `}>
                      
                      {/* Left Stub (Emoji) */}
                      <div className={`
                        w-24 flex items-center justify-center text-4xl bg-gradient-to-br border-r-2 border-dashed border-white/50 relative
                        ${coupon.color}
                      `}>
                        {/* Perforation Circles */}
                        <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#fce7f3] rounded-full"></div>
                        <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#fce7f3] rounded-full"></div>
                        
                        <span className="drop-shadow-sm">{coupon.emoji}</span>
                      </div>

                      {/* Right Content */}
                      <div className={`flex-1 flex flex-col justify-center px-6 bg-white`}>
                        <h3 className="font-bold text-gray-800 text-lg mb-1">{coupon.title}</h3>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed mb-1">{coupon.desc}</p>
                        {coupon.expiry && (
                          <p className="text-[10px] text-red-400 font-bold">Expires: {coupon.expiry}</p>
                        )}
                        {coupon.points && coupon.points > 0 && (
                           <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-200">
                             +{coupon.points} pts
                           </div>
                        )}
                      </div>
                    </div>

                    {/* Redeemed Stamp Overlay */}
                    {isRedeemed && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 2, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: -15 }}
                        transition={{ type: "spring", stiffness: 200, damping: 10 }}
                        className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                      >
                        <div className="border-4 border-red-500/50 text-red-500/50 rounded-lg px-4 py-2 text-2xl font-black uppercase tracking-widest transform -rotate-12 bg-white/30 backdrop-blur-sm">
                          Redeemed
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoveCoupons;
