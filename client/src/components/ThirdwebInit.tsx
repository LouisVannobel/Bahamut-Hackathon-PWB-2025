import React, { ReactNode, useEffect, useState } from 'react';

interface ThirdwebInitProps {
  children: ReactNode;
}

// Cette composante est maintenant simplifiée et ne fournit plus de providers,
// puisque ceux-ci sont dans App.tsx
export default function ThirdwebInit({ children }: ThirdwebInitProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Simuler un délai d'initialisation pour éviter des problèmes de rendu
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isInitialized) {
    return <div>Initialisation...</div>;
  }
  
  // Retourner simplement les enfants sans les encapsuler dans des providers
  return <>{children}</>;
}