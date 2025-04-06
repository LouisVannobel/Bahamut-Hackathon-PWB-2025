import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { ResultColor, SpinResult } from "@/lib/roulette";
import { useTheme } from "@/context/ThemeContext";

interface ResultOverlayProps {
  show: boolean;
  message: string;
  result: ResultColor | null;
  onClose: () => void;
}

export default function ResultOverlay({ show, message, result, onClose }: ResultOverlayProps) {
  const { theme } = useTheme();
  const [autoClose, setAutoClose] = useState<NodeJS.Timeout | null>(null);
  
  // Auto close after 5 seconds
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      setAutoClose(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [show, onClose]);
  
  // Clear auto close on manual close
  const handleClose = () => {
    if (autoClose) {
      clearTimeout(autoClose);
      setAutoClose(null);
    }
    onClose();
  };

  // Déterminer si c'est une victoire ou une défaite
  const isWin = result === "red" || result === "black"; // Si un résultat est présent, c'est une victoire
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-70" onClick={handleClose}></div>
          
          <motion.div 
            className={`relative ${theme === 'dark' ? 'bg-[#1E1E1E] border-gray-700' : 'bg-white border-gray-300'} rounded-xl p-8 max-w-md mx-auto shadow-2xl border-2 overflow-hidden`}
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
          >
            <button 
              className={`absolute top-3 right-3 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'} transition-colors`}
              onClick={handleClose}
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div 
                className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                  isWin 
                    ? "bg-gradient-to-br from-green-400 to-green-600" 
                    : "bg-gradient-to-br from-red-400 to-red-600"
                }`}
              >
                {isWin ? (
                  <Check className="h-10 w-10 text-white" />
                ) : (
                  <X className="h-10 w-10 text-white" />
                )}
              </div>
              
              <h2 className={`text-2xl font-bold mb-2 ${
                isWin 
                  ? "text-green-500" 
                  : "text-red-500"
              }`}>
                {isWin ? "Vous avez gagné !" : "Vous avez perdu !"}
              </h2>
              
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {message}
              </p>
              
              <div className="w-full mt-8">
                <button
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    isWin
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                  onClick={handleClose}
                >
                  Continuer à jouer
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
