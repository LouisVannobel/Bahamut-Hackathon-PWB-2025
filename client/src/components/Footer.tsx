import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#FF69B4] border-t border-gray-800 py-4 text-center">
      <div className="container mx-auto px-4">
        <p className="text-white text-sm">
          LooserBracket 2025 | Decentralized Casino on Bahamut Blockchain
        </p>
        <div className="mt-2 flex justify-center space-x-4">
          <a href="#" className="text-white hover:text-black transition-colors">
            Terms
          </a>
          <a href="#" className="text-white hover:text-black transition-colors">
            Privacy
          </a>
          <a href="#" className="text-white hover:text-black transition-colors">
            Documentation
          </a>
        </div>
      </div>
    </footer>
  );
}
