
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
    // Determine bounds for the random jump. 
    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;
    
    // Create a random offset. 
    // Increased range to 0.85 to make it jump further across the screen
    const offsetX = (Math.random() - 0.5) * (vWidth * 0.7);
    const offsetY = (Math.random() - 0.5) * (vHeight * 0.7);
    // Add random rotation for unpredictability
    const rotation = (Math.random() - 0.5) * 45;
    
    setNoButtonPos({ x: offsetX, y: offsetY, rotate: rotation });
  }, []);

  // Proximity detection logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!noButtonRef.current) return;

      const rect = noButtonRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const buttonCenterY = rect.top + rect.height / 2;

      const d = Math.sqrt(
        Math.pow(e.clientX - buttonCenterX, 2) + 
        Math.pow(e.clientY - buttonCenterY, 2)
      );

      setDistance(d);

      // Increased reaction distance to 220px - makes it run away sooner (harder to catch)
      if (d < 220) {
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
      setDistance(1000); // Reset distance
      if (onStepChange) onStepChange(step); 
    } else {
      if (onStepChange) onStepChange(questions.questions.length);
      onAccept();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 0.8, 1], 
              opacity: [0, 0.6, 0.3, 0],
              y: -600,
              x: (Math.random() - 0.5) * 600
            }}
            transition={{ 
              duration: 4 + Math.random() * 6, 
              repeat: Infinity, 
              delay: Math.random() * 5 
            }}
            className="absolute text-pink-300/60 text-4xl filter drop-shadow-lg"
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 100}%` 
            }}
          >❤️</motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -30 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center z-10 p-8 md:p-12 bg-white/70 backdrop-blur-xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/60 max-w-2xl w-[90%] flex flex-col items-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
          {/* Logo prominently displayed */}
          <Logo size={240} className="mb-6" title={appName} />

          <motion.div
            animate={{ 
              y: [0, -10, 0], 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1] 
            }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="text-6xl mb-6 select-none"
          >
            {step === 1 ? '🌹' : step === questions.questions.length ? '🤴' : '✨'}
          </motion.div>
          
          <h1 className="text-3xl md:text-5xl font-outfit font-black text-red-600 mb-8 px-4 leading-tight drop-shadow-sm select-none tracking-tight">
            {questions.questions[step - 1]}
          </h1>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 relative min-h-[140px] w-full px-4">
            <motion.button
              whileHover={{ 
                scale: 1.15, 
                boxShadow: "0 20px 50px rgba(239, 68, 68, 0.6)",
                rotate: 2 
              }}
              whileTap={{ scale: 0.9 }}
              onClick={handleYes}
              className="px-14 py-5 bg-gradient-to-r from-red-500 via-pink-500 to-red-500 bg-[length:200%_auto] text-white text-2xl font-black rounded-full shadow-2xl z-20 min-w-[180px] select-none"
              style={{
                animation: 'gradient-flow 3s linear infinite'
              }}
            >
              YES! ❤️
            </motion.button>

            <motion.button
              ref={noButtonRef}
              animate={{ 
                x: noButtonPos.x, 
                y: noButtonPos.y,
                rotate: noButtonPos.rotate + (distance < 220 ? (Math.random() - 0.5) * 10 : 0),
                scale: distance < 220 ? 0.9 + (Math.random() * 0.1) : 1,
                opacity: distance < 300 ? 0.4 + (distance / 300) * 0.6 : 1
              }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30,     
                mass: 0.5        
              }}
              onMouseEnter={moveButton}
              onClick={moveButton}
              className="px-8 py-3 bg-white/40 backdrop-blur-md text-gray-500 text-lg font-bold rounded-full shadow-lg border border-white/50 z-30 whitespace-nowrap select-none hover:bg-white/60 transition-colors"
              style={{
                position: 'relative' 
              }}
            >
              No 🥺
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      <footer className="absolute bottom-10 text-red-500/50 font-bold tracking-[0.3em] text-sm md:text-base italic uppercase select-none">
        {step === 1 ? `Welcome to ${appName}` : `Step ${step} of ${questions.questions.length}`}
      </footer>

      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default ProposalScreen;
