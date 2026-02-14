import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border-2 border-green-100"
          >
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs shadow-sm">
                <i className="fas fa-check"></i>
            </div>
            <span className="text-sm font-black text-gray-700 tracking-wide">{message}</span>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
