"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

interface ProposalScreenProps {
  onAccept: () => void;
  onStepChange?: (step: number) => void;
  questions: {
    questions: string[];
    progress?: number;
  };
  appName: string;
}

const ProposalScreen: React.FC<ProposalScreenProps> = ({ onAccept, onStepChange, questions, appName }) => {
  const initialStep = Math.min((questions.progress || 0) + 1, questions.questions.length);
  const [step, setStep] = useState(initialStep);
  const [noButtonPos, setNoButtonPos] = useState({ x: 0, y: 0, rotate: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);

  const [distance, setDistance] = useState(1000);

  const moveButton = useCallback(() => {
    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;
    const offsetX = (Math.random() - 0.5) * (vWidth * 0.6);
    const offsetY = (Math.random() - 0.5) * (vHeight * 0.6);
    const rotation = (Math.random() - 0.5) * 30;
    setNoButtonPos({ x: offsetX, y: offsetY, rotate: rotation });
  }, []);

  const noButtonPosRef = useRef(noButtonPos);
  useEffect(() => {
    noButtonPosRef.current = noButtonPos;
  }, [noButtonPos]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!noButtonRef.current) return;
      const rect = noButtonRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const buttonCenterY = rect.top + rect.height / 2;
      const d = Math.sqrt(Math.pow(e.clientX - buttonCenterX, 2) + Math.pow(e.clientY - buttonCenterY, 2));
      setDistance(d);
      
      const currentPos = noButtonPosRef.current;
      const startCenterX = buttonCenterX - currentPos.x;
      const startCenterY = buttonCenterY - currentPos.y;
      const distToStart = Math.sqrt(Math.pow(e.clientX - startCenterX, 2) + Math.pow(e.clientY - startCenterY, 2));

      if ((currentPos.x !== 0 || currentPos.y !== 0) && distToStart > 350) {
        setNoButtonPos({ x: 0, y: 0, rotate: 0 });
        setDistance(1000);
      } else if (d < 180) {
        moveButton();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [moveButton]);

  const handleYes = () => {
    if (step < questions.questions.length) {
      const nextStep = step + 1;
      setStep(nextStep);
      setNoButtonPos({ x: 0, y: 0, rotate: 0 });
      setDistance(1000);
      if (onStepChange) onStepChange(step); 
    } else {
      if (onStepChange) onStepChange(questions.questions.length);
      onAccept();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl overflow-hidden font-geist"
    >
      {/* Background decoration refactored to minimalist particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.2, 0],
              y: -800,
              x: (Math.random() - 0.5) * 800
            }}
            transition={{ 
              duration: 8 + Math.random() * 8, 
              repeat: Infinity, 
              delay: Math.random() * 5 
            }}
            className="absolute text-white/10 text-xl font-black"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          >
             {Math.random() > 0.5 ? '✦' : '✧'}
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="text-center z-10 p-12 md:p-20 bg-white/5 backdrop-blur-md rounded-clay border border-white/10 max-w-2xl w-[90%] flex flex-col items-center relative"
        >
          <div className="absolute top-10 left-10 text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">PROTOCOL LEVEL {step}</div>
          
          <div className="mb-12">
            <Logo size={200} className="grayscale opacity-40 hover:opacity-100 transition-opacity duration-1000" title={appName} />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-white mb-16 px-4 leading-tight tracking-tight uppercase">
            {questions.questions[step - 1]}
          </h1>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 relative min-h-[160px] w-full px-4">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: '#fff', color: '#000' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleYes}
              className="px-16 py-6 bg-white/10 text-white text-xl font-black rounded-pill border border-white/20 shadow-2xl z-20 min-w-[200px] uppercase tracking-[0.2em] transition-all duration-500"
            >
              AFFIRMATIVE
            </motion.button>

            <motion.button
              ref={noButtonRef}
              animate={{ 
                x: noButtonPos.x, 
                y: noButtonPos.y,
                rotate: noButtonPos.rotate,
                opacity: distance < 200 ? 0.2 : 1
              }}
              transition={{ type: "spring", stiffness: 450, damping: 35, mass: 0.4 }}
              onMouseEnter={moveButton}
              onClick={moveButton}
              className="px-10 py-4 bg-transparent text-white/20 text-sm font-black rounded-pill border border-white/5 z-30 whitespace-nowrap uppercase tracking-[0.3em] hover:text-white/40 transition-all"
            >
              Negative
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      <footer className="absolute bottom-16 text-white/5 font-black tracking-[0.8em] text-[10px] uppercase">
        {step === questions.questions.length ? "FINAL AUTHENTICATION REQUIRED" : "SEQUENTIAL VALIDATION IN PROGRESS"}
      </footer>
    </div>
  );
};

export default ProposalScreen;
