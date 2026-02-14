"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';

interface LoveQuestProps {
  partner1: string;
  partner2: string;
  onComplete: (questText: string) => void;
}

const FALLBACK_QUESTS = [
  "Send a surprise 'I love you' text right now. ❤️",
  "Hide a tiny love note in their pocket or bag. 📝",
  "A spontaneous 30-second hug. No letting go! 🤗",
  "Complement their smile today. ✨",
  "Share a memory of your favorite date. 🌹",
  "Make a cup of their favorite drink. ☕",
  "Send a silly selfie to make them laugh. 🤪",
  "Plan a 10-minute walk together for later. 🚶‍♂️🚶‍♀️",
  "Write down 3 things you love about them. 💖",
  "Give them a quick back or shoulder rub. 💆‍♂️",
  "Listen to your 'song' together for a moment. 🎶",
  "Leave a sweet sticky note on the mirror. 🪞",
  "Order or pick up their favorite snack. 🥨",
  "Take a photo together to commemorate today. 📸"
];

const LoveQuest: React.FC<LoveQuestProps> = ({ partner1, partner2, onComplete }) => {
  const [quest, setQuest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const generateQuest = async () => {
    setIsLoading(true);
    setQuest(null);
    setIsDone(false);
    setIsLocalMode(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a single, short, heartwarming 'Daily Love Quest' for a couple named ${partner1} and ${partner2}. 
        The quest should be a small romantic task they can do together today. 
        Keep it under 15 words. Include 1 emoji. No extra text or titles.`,
      });

      if (response.text) {
        setQuest(response.text.trim());
      } else {
        throw new Error("Empty response");
      }
    } catch (error: any) {
      console.warn("Quest generation shifted to Local Mode:", error);
      const randomQuest = FALLBACK_QUESTS[Math.floor(Math.random() * FALLBACK_QUESTS.length)];
      setQuest(randomQuest);
      setIsLocalMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateQuest();
  }, []);

  const handleComplete = () => {
    if (quest) {
      setIsDone(true);
      onComplete(quest);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-[0_10px_30px_rgba(236,72,153,0.15)] border-2 border-pink-100 max-w-sm w-full relative"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-pacifico text-pink-500 text-lg">Daily Love Quest</h3>
        {isLocalMode ? (
          <span className="text-[10px] font-black text-pink-300 uppercase tracking-widest bg-pink-50 px-2 py-0.5 rounded">Local Mode</span>
        ) : (
          <span className="text-xl">✨</span>
        )}
      </div>

      <div className="min-h-[60px] flex items-center justify-center text-center">
        {isLoading ? (
          <div className="flex gap-1">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-pink-400 rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-pink-400 rounded-full" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-pink-400 rounded-full" />
          </div>
        ) : (
          <p className="text-gray-700 font-bold leading-relaxed px-2">
            {isDone ? "Quest Master! 🎉" : quest}
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        {!isDone && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleComplete}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-2 rounded-xl shadow-md disabled:opacity-50"
          >
            I did it! ❤️
          </motion.button>
        )}
        <button
          onClick={generateQuest}
          disabled={isLoading}
          className="p-2 text-pink-200 hover:text-pink-500 transition-colors"
          title="New Quest"
        >
          <i className="fas fa-redo-alt"></i>
        </button>
      </div>
    </motion.div>
  );
};

export default LoveQuest;
