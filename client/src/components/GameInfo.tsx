import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";

export default function GameInfo() {
  const { theme } = useTheme();
  
  return (
    <Card className={`${theme === 'dark' ? 'bg-[#1E1E1E] text-white border-gray-700' : 'bg-white text-[#1E1E1E] border-gray-300'} rounded-2xl shadow-lg border-2 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(138,43,226,0.15),transparent_70%)] z-0"></div>
      <CardContent className="p-6 relative z-10">
        <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-[#F5F5F5]' : 'text-[#1E1E1E]'}`}>Blockchain Roulette</h2>
        <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm mb-6`}>
          Place your bets on the decentralized roulette powered by Sepolia blockchain technology. 
          Smart contracts ensure fair gameplay with provably random outcomes.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-600 mr-2 shadow-sm"></span>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Red - 16 slots</span>
          </div>
          <div className="flex items-center">
            <span className={`w-3 h-3 rounded-full bg-black ${theme === 'dark' ? 'border border-gray-600' : 'border border-gray-400'} mr-2 shadow-sm`}></span>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Black - 16 slots</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-600 mr-2 shadow-sm"></span>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Green - 1 slot</span>
          </div>
        </div>
        
        <div className={`mt-6 pt-6 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} border-t`}>
          <h3 className="font-semibold mb-3 text-[#8A2BE2]">Rewards</h3>
          <div className="space-y-2 text-sm">
            <div className={`${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} p-3 rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Win with FTN:</p>
              <p className="text-green-500 font-medium">2x your bet</p>
            </div>
            <div className={`${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} p-3 rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Win with LBR:</p>
              <p className="text-green-500 font-medium">1x your bet in FTN</p>
            </div>
            <div className={`${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} p-3 rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Lose with FTN:</p>
              <p className="text-orange-500 font-medium">Lose bet but gain LBR</p>
            </div>
            <div className={`${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} p-3 rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Lose with LBR:</p>
              <p className="text-red-500 font-medium">Total loss</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
