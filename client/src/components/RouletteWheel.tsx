import React, { useState, useEffect } from 'react';
import { Bitcoin, Coins } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface RouletteNumber {
  number: number;
  color: 'red' | 'black' | 'green';
}

const numbers: RouletteNumber[] = [
  { number: 0, color: 'green' },
  { number: 32, color: 'red' },
  { number: 15, color: 'black' },
  { number: 19, color: 'red' },
  { number: 4, color: 'black' },
  { number: 21, color: 'red' },
  { number: 2, color: 'black' },
  { number: 25, color: 'red' },
  { number: 17, color: 'black' },
  { number: 34, color: 'red' },
  { number: 6, color: 'black' },
  { number: 27, color: 'red' },
  { number: 13, color: 'black' },
  { number: 36, color: 'red' },
  { number: 11, color: 'black' },
  { number: 30, color: 'red' },
  { number: 8, color: 'black' },
  { number: 23, color: 'red' },
  { number: 10, color: 'black' },
  { number: 5, color: 'red' },
  { number: 24, color: 'black' },
  { number: 16, color: 'red' },
  { number: 33, color: 'black' },
  { number: 1, color: 'red' },
  { number: 20, color: 'black' },
  { number: 14, color: 'red' },
  { number: 31, color: 'black' },
  { number: 9, color: 'red' },
  { number: 22, color: 'black' },
  { number: 18, color: 'red' },
  { number: 29, color: 'black' },
  { number: 7, color: 'red' },
  { number: 28, color: 'black' },
  { number: 12, color: 'red' },
  { number: 35, color: 'black' },
  { number: 3, color: 'red' },
  { number: 26, color: 'black' }
];

interface RouletteWheelProps {
  isSpinning: boolean;
  resultColor: string | null;
  result: any | null;
  resultMessage: string;
}

const RouletteWheel: React.FC<RouletteWheelProps> = ({ 
  isSpinning: externalSpinning, 
  resultColor,
  result,
  resultMessage
}) => {
  const { theme } = useTheme();
  const [spinning, setSpinning] = useState(false);
  const [localResult, setLocalResult] = useState<RouletteNumber | null>(null);
  const [rotation, setRotation] = useState(0);
  const [bet, setBet] = useState(0.1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Synchroniser l'état de spinning externe avec l'état local
  useEffect(() => {
    setSpinning(externalSpinning);
  }, [externalSpinning]);

  // Gérer l'animation de la roue quand spinning change
  useEffect(() => {
    if (!spinning) return;
    
    // Sélectionner un résultat aléatoire
    const randomNumber = Math.floor(Math.random() * numbers.length);
    const extraSpins = 5;
    const targetRotation = rotation + (360 * extraSpins) + (randomNumber * (360 / numbers.length));
    
    // Set rotation only once when spinning changes to true
    setRotation(targetRotation);

    // Animer l'indicateur de sélection
    let currentIndex = 0;
    const intervalTime = 100; // Démarre rapidement
    let currentInterval = intervalTime;
    
    const animateSelection = () => {
      setSelectedIndex(currentIndex);
      currentIndex = (currentIndex + 1) % numbers.length;
      
      // Ralentir progressivement l'animation de sélection
      currentInterval *= 1.05;
      
      if (currentInterval < 500) { // Continuer l'animation jusqu'à ce qu'on atteigne une vitesse plus lente
        setTimeout(animateSelection, currentInterval);
      } else {
        // Sélection finale
        setTimeout(() => {
          setSelectedIndex(randomNumber);
          setLocalResult(numbers[randomNumber]);
          setSpinning(false);
        }, 500);
      }
    };

    animateSelection();
    
    // Only include spinning in the dependency array, not rotation
    // This prevents the infinite loop when rotation changes
  }, [spinning]);

  return (
    <div className="relative w-full h-full">
      {/* Outer decorative ring with enhanced glow */}
      <div className={`absolute inset-0 rounded-full ${theme === 'light' ? 'bg-[#E9ECEF]' : 'bg-[#2D2654]'} shadow-[inset_0_0_80px_rgba(147,51,234,0.4),0_0_30px_rgba(147,51,234,0.3)] transform transition-transform duration-5000 ease-out overflow-hidden`}>
        {/* Metallic effect overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(255,255,255,0.15)_50%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.3)_0%,transparent_60%)]" />
      </div>

      {/* Selection indicator - maintenant retourné pour pointer vers le bas avec glow amélioré */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[8%] h-[8%] z-10">
        <div className="w-full h-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-dark)] clip-triangle shadow-[0_0_15px_rgba(147,51,234,0.5)] rotate-180">
          <div className="absolute inset-0 opacity-50 bg-[linear-gradient(180deg,rgba(255,255,255,0.8)_0%,transparent_60%)]"></div>
        </div>
      </div>

      {/* Main wheel with enhanced wood-like texture and glow */}
      <div 
        className={`absolute w-[85%] h-[85%] top-[7.5%] left-[7.5%] rounded-full ${theme === 'light' ? 'bg-[#CED4DA]' : 'bg-[#1E1A3C]'} shadow-[inset_0_0_40px_rgba(0,0,0,0.7),0_0_25px_rgba(147,51,234,0.4)] transform transition-transform duration-5000 ease-out overflow-hidden`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Wood grain effect */}
        <div className={`absolute inset-0 opacity-20 ${theme === 'light' ? 'bg-[repeating-radial-gradient(circle_at_center,#ADB5BD,#CED4DA_2px,#DEE2E6_3px,#CED4DA_4px)]' : 'bg-[repeating-radial-gradient(circle_at_center,#4A4063,#2D2654_2px,#1E1A3C_3px,#2D2654_4px)]'}`} />
        
        {/* Cases de la roulette en forme de parts de pizza */}
        {numbers.map((num, index) => {
          const angle = (index * 360) / numbers.length;
          const nextAngle = ((index + 1) * 360) / numbers.length;
          const isSelected = selectedIndex === index;
          
          // Calculer les coordonnées pour créer une forme de part de pizza
          const centerX = 50;
          const centerY = 50;
          const outerRadius = 50;
          const innerRadius = 20; // Rayon du cercle central
          
          // Points pour la forme de part de pizza (en pourcentage)
          const x1 = centerX + innerRadius * Math.cos((angle - 90) * Math.PI / 180);
          const y1 = centerY + innerRadius * Math.sin((angle - 90) * Math.PI / 180);
          const x2 = centerX + outerRadius * Math.cos((angle - 90) * Math.PI / 180);
          const y2 = centerY + outerRadius * Math.sin((angle - 90) * Math.PI / 180);
          const x3 = centerX + outerRadius * Math.cos((nextAngle - 90) * Math.PI / 180);
          const y3 = centerY + outerRadius * Math.sin((nextAngle - 90) * Math.PI / 180);
          const x4 = centerX + innerRadius * Math.cos((nextAngle - 90) * Math.PI / 180);
          const y4 = centerY + innerRadius * Math.sin((nextAngle - 90) * Math.PI / 180);
          
          const clipPath = `polygon(${x1}% ${y1}%, ${x2}% ${y2}%, ${x3}% ${y3}%, ${x4}% ${y4}%)`;
          
          // Calculer la position du texte (plus proche du bord extérieur)
          const textAngle = (angle + nextAngle) / 2;
          const textRadius = innerRadius + (outerRadius - innerRadius) * 0.75; // 75% du chemin vers le bord extérieur
          const textX = centerX + textRadius * Math.cos((textAngle - 90) * Math.PI / 180);
          const textY = centerY + textRadius * Math.sin((textAngle - 90) * Math.PI / 180);
          
          return (
            <div
              key={num.number}
              className={`absolute inset-0 ${isSelected ? 'z-10' : 'z-0'}`}
            >
              <div
                className={`absolute inset-0
                  ${num.color === 'red' 
                    ? 'bg-gradient-to-b from-red-600 to-red-800' 
                    : num.color === 'black' 
                      ? 'bg-gradient-to-b from-gray-800 to-gray-900' 
                      : 'bg-gradient-to-b from-emerald-600 to-emerald-800'}
                  ${isSelected ? 'ring-1 ring-yellow-400 ring-opacity-75 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : ''}
                  shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]
                  transition-all duration-100`}
                style={{ 
                  clipPath: clipPath,
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),transparent_50%,rgba(255,255,255,0.1))]" />
              </div>
              
              {/* Numéro positionné au milieu de la case */}
              <div 
                className={`absolute font-bold text-white text-shadow transition-all duration-100 transform -translate-x-1/2 -translate-y-1/2
                  ${isSelected ? 'scale-110 text-yellow-200' : ''}`}
                style={{
                  left: `${textX}%`,
                  top: `${textY}%`,
                  fontSize: 'clamp(0.7rem, 3vw, 1rem)'
                }}
              >
                {num.number}
              </div>
            </div>
          );
        })}

        {/* Center decoration - style casino avec glow amélioré */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] rounded-full ${theme === 'light' ? 'bg-gradient-to-br from-[#ADB5BD] to-[#CED4DA] border-4 border-[#6C757D]' : 'bg-gradient-to-br from-[#2D2654] to-[#1E1A3C] border-4 border-[#4A4063]'} shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_0_40px_rgba(147,51,234,0.4)] flex items-center justify-center overflow-hidden z-20`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.4)_0%,transparent_70%)]" />
          <div className="absolute inset-0 opacity-30">
            {/* Motif de casino */}
            <div className={`absolute inset-0 ${theme === 'light' ? 'bg-[repeating-conic-gradient(from_0deg,#6C757D_0deg_30deg,#ADB5BD_30deg_60deg)]' : 'bg-[repeating-conic-gradient(from_0deg,#4A4063_0deg_30deg,#2D2654_30deg_60deg)]'}`}></div>
          </div>
          <div className={`relative w-[80%] h-[80%] rounded-full ${theme === 'light' ? 'bg-gradient-to-br from-[#CED4DA] to-[#ADB5BD] border-2 border-[#6C757D]' : 'bg-gradient-to-br from-[#3D3668] to-[#1E1A3C] border-2 border-[#6A5A9E]'} flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]`}>
            <div className="text-[min(3vmin,1.4rem)] font-bold text-white text-shadow tracking-wider z-10 flex flex-col items-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-red-300">♠</span>
                <span className="text-red-400">♥</span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-red-400">♦</span>
                <span className="text-red-300">♣</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affichage du résultat avec glow amélioré - Supprimé à la demande de l'utilisateur */}
    </div>
  );
};

export default RouletteWheel;