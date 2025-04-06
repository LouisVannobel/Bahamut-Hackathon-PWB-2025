import React from "react";
import { truncateAddress } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import ThirdwebConnectButton from "./ConnectButton";

export default function Header() {
  return (
    <header className="sticky top-0 w-full bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] border-b border-gray-800 py-4 z-50 shadow-lg">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="text-3xl font-bold text-white">
            LooserBracket
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <ThirdwebConnectButton />
        </div>
      </div>
    </header>
  );
}
