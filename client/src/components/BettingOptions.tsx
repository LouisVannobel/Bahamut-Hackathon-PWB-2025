import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from "@/components/ui/select";
import { formatNumber } from "@/lib/utils";
import { Bet, BetAmount, BetColor, Token } from "@/lib/roulette";
import { useTheme } from "@/context/ThemeContext";

interface BettingOptionsProps {
  bet: Bet;
  onBetAmountChange: (amount: BetAmount | null) => void;
  onTokenChange: (token: Token) => void;
  onColorChange: (color: BetColor | null) => void;
  disabled: boolean;
}

export default function BettingOptions({
  bet,
  onBetAmountChange,
  onTokenChange,
  onColorChange,
  disabled
}: BettingOptionsProps) {
  const { theme } = useTheme();
  
  const handleBetAmountClick = (amount: BetAmount) => {
    if (disabled) return;
    onBetAmountChange(bet.amount === amount ? null : amount);
  };

  const handleBetColorClick = (color: BetColor) => {
    if (disabled) return;
    onColorChange(bet.color === color ? null : color);
  };

  const handleTokenChange = (value: string) => {
    if (disabled) return;
    onTokenChange(value as Token);
  };

  return (
    <Card className={`${theme === 'dark' ? 'bg-[#1E1E1E] text-white border-gray-700' : 'bg-white text-[#1E1E1E] border-gray-300'} rounded-2xl shadow-lg border-2 relative overflow-hidden backdrop-blur-sm`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(138,43,226,0.08),transparent_70%)] z-0"></div>
      <CardContent className="p-6 relative z-10">
        <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-[#1E1E1E]'}`}>Place Your Bet</h2>
        
        <div className="space-y-6">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select Token</Label>
            <Select
              value={bet.token}
              onValueChange={handleTokenChange}
              disabled={disabled}
            >
              <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-[#2D2D2D] border-gray-600 text-white' : 'bg-gray-50 border-gray-400 text-gray-800'} rounded-xl border-2 shadow-md`}>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent className={`${theme === 'dark' ? 'bg-[#2D2D2D] border-gray-600 text-white' : 'bg-white border-gray-400 text-gray-800'} rounded-xl border-2`}>
                <SelectItem value="FTN" className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 mr-2"></span>
                    <span>FTN</span>
                  </div>
                </SelectItem>
                <SelectItem value="LBR" className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 mr-2"></span>
                    <span>LBR</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Bet Amount */}
          <div className="space-y-2">
            <Label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Bet Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {[0.1, 0.5, 1, 5, 10, 25].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleBetAmountClick(amount as BetAmount)}
                  disabled={disabled}
                  className={`
                    py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2
                    ${bet.amount === amount 
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white ring-2 ring-purple-500 ring-opacity-50 border-transparent shadow-lg' 
                      : theme === 'dark'
                        ? 'bg-[#2D2D2D] text-gray-200 hover:bg-gray-700 border-gray-600'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  `}
                >
                  {formatNumber(amount)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Color Selection */}
          <div className="space-y-2">
            <Label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Select Color</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleBetColorClick("red")}
                disabled={disabled}
                className={`
                  relative py-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center border-2
                  ${bet.color === "red" 
                    ? 'ring-2 ring-purple-500 ring-opacity-50 scale-105 shadow-lg border-red-600' 
                    : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                `}
              >
                <span className="w-8 h-8 rounded-full bg-red-600 mb-2 shadow-md"></span>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Red</span>
                {bet.color === "red" && (
                  <Check className="absolute top-2 right-2 h-4 w-4 text-white bg-green-500 rounded-full p-0.5" />
                )}
              </button>
              
              <button
                type="button"
                onClick={() => handleBetColorClick("black")}
                disabled={disabled}
                className={`
                  relative py-4 rounded-xl transition-all duration-200 flex flex-col items-center justify-center border-2
                  ${bet.color === "black" 
                    ? 'ring-2 ring-purple-500 ring-opacity-50 scale-105 shadow-lg border-gray-800' 
                    : theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                `}
              >
                <span className={`w-8 h-8 rounded-full bg-black ${theme === 'dark' ? 'border border-gray-600' : 'border border-gray-400'} mb-2 shadow-md`}></span>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Black</span>
                {bet.color === "black" && (
                  <Check className="absolute top-2 right-2 h-4 w-4 text-white bg-green-500 rounded-full p-0.5" />
                )}
              </button>
            </div>
          </div>
          
          {/* Bet Summary */}
          <div className={`mt-4 pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} border-t`}>
            <div className="text-center">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Your bet: {bet.amount !== null ? `${formatNumber(bet.amount)} ${bet.token}` : "0"} on {bet.color ? bet.color : "none"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
