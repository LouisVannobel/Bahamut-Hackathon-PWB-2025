import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useThirdwebWallet } from "@/hooks/use-thirdweb-wallet";

// Maintenant on importe depuis roulette.ts au lieu d'exporter
import { Token } from "@/lib/roulette";

export interface WalletContextType {
  address: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  mockUserId: number | null;
  ftnBalance: number;
  lbrBalance: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const defaultContext: WalletContextType = {
  address: null,
  isConnecting: false,
  isConnected: false,
  mockUserId: null,
  ftnBalance: 0,
  lbrBalance: 0,
  connect: async () => {},
  disconnect: () => {},
  refreshBalance: async () => {},
};

const WalletContext = createContext<WalletContextType>(defaultContext);

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = (props: WalletProviderProps) => {
  // Utilisons maintenant le hook ThirdWeb
  const {
    address,
    isConnecting,
    isConnected,
    mockUserId,
    ftnBalance,
    lbrBalance,
    connect,
    disconnect,
    refreshBalance,
  } = useThirdwebWallet();

  const contextValue: WalletContextType = {
    address,
    isConnecting,
    isConnected,
    mockUserId,
    ftnBalance,
    lbrBalance,
    connect,
    disconnect,
    refreshBalance
  };

  // Use React.createElement to create the provider
  return React.createElement(
    WalletContext.Provider,
    { value: contextValue },
    props.children
  );
};