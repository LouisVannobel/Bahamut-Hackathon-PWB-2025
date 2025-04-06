import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-purple-500 ${
        theme === 'dark' 
          ? 'bg-purple-900' 
          : 'bg-purple-200'
      }`}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      <span 
        className={`absolute left-1 transform transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {theme === 'dark' ? (
          <Moon size={16} className="text-white" />
        ) : (
          <Sun size={16} className="text-purple-800" />
        )}
      </span>
      <span 
        className={`absolute block w-4 h-4 rounded-full transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-white left-7' 
            : 'bg-white left-1'
        }`}
      />
    </button>
  );
}
