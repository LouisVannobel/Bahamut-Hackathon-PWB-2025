import React, { ReactNode } from 'react';

interface WalletProviderProps {
  children: ReactNode;
}

// Ce composant est simplifié car le ThirdwebProvider et le QueryClientProvider
// sont déjà configurés dans App.tsx
export default function WalletProvider({ children }: WalletProviderProps) {
  // Retourner directement les enfants sans ajouter de providers supplémentaires
  return <>{children}</>;
}