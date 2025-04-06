import React, { ReactNode } from "react";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "./ThemeToggle";
import ThirdwebConnectButton from "./ConnectButton";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#121212]' : 'bg-white'}`}>
      {/* Overlay pour créer un effet de dégradé global sans délimitation nette */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {theme === 'dark' ? (
          <>
            {/* Dégradé du haut (header vers body) */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#8A2BE2] via-[#4A1D96] to-transparent opacity-20"></div>
            
            {/* Dégradé du bas (footer vers body) */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-[#8A2BE2] via-[#4A1D96] to-transparent opacity-20"></div>
            
            {/* Effet de halo au centre */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(138,43,226,0.1),transparent_70%)]"></div>
            
            {/* Effets d'illumination aléatoires (mode sombre) */}
            <div className="absolute top-[20%] left-[15%] w-64 h-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(138,43,226,0.15),transparent_70%)] blur-xl"></div>
            <div className="absolute top-[60%] right-[10%] w-80 h-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,105,180,0.1),transparent_70%)] blur-xl"></div>
            <div className="absolute bottom-[30%] left-[25%] w-72 h-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(75,0,130,0.12),transparent_70%)] blur-xl"></div>
          </>
        ) : (
          <>
            {/* Dégradé du haut (header vers body) en mode clair */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#8A2BE2] via-[#B87CE8] to-transparent opacity-10"></div>
            
            {/* Dégradé du bas (footer vers body) en mode clair */}
            <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-[#8A2BE2] via-[#B87CE8] to-transparent opacity-10"></div>
            
            {/* Effet de halo au centre en mode clair */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(138,43,226,0.05),transparent_70%)]"></div>
            
            {/* Ombres colorées (mode clair) */}
            <div className="absolute top-[25%] left-[20%] w-64 h-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(138,43,226,0.07),transparent_70%)] blur-xl"></div>
            <div className="absolute top-[55%] right-[15%] w-80 h-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,105,180,0.05),transparent_70%)] blur-xl"></div>
            <div className="absolute bottom-[35%] left-[30%] w-72 h-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(75,0,130,0.06),transparent_70%)] blur-xl"></div>
          </>
        )}
      </div>
      
      {/* Structure principale sans délimitation visuelle nette */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className={`${theme === 'dark' ? 'text-white' : 'text-black'} py-6`}>
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-3xl font-bold">
                LooserBracket
              </div>
              <span className="ml-2 text-xs font-light">BETA</span>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ThirdwebConnectButton />
            </div>
          </div>
        </div>
        
        <main className="flex-grow py-10">
          <div className="w-full">
            {children}
          </div>
        </main>
        
        <div className={`${theme === 'dark' ? 'text-white' : 'text-black'} py-6 text-center mt-10`}>
          <div className="container mx-auto px-4">
            <p className="text-sm">
              LooserBracket 2025 | Decentralized Casino on Bahamut Blockchain
            </p>
            <div className="mt-2 flex justify-center space-x-4">
              <a href="#" className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'} transition-colors`}>
                Terms
              </a>
              <a href="#" className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'} transition-colors`}>
                Privacy
              </a>
              <a href="#" className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'} transition-colors`}>
                Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
