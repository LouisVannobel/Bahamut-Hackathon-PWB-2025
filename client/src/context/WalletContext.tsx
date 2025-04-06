import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';

// Type pour le contexte
interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
}

// Valeur par défaut du contexte
const defaultContext: WalletContextType = {
  isConnected: false,
  walletAddress: null,
};

// Création du contexte
const WalletContext = createContext<WalletContextType>(defaultContext);

// Hook personnalisé pour utiliser le contexte
export const useWallet = () => useContext(WalletContext);

// Props pour le provider
interface WalletProviderProps {
  children: ReactNode;
}

// Provider du contexte
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Utiliser les hooks de ThirdWeb v5 pour obtenir le compte actif et le wallet
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  
  // Mettre à jour l'état de connexion lorsque le compte actif change
  useEffect(() => {
    console.log("ThirdWeb Active Account:", activeAccount);
    console.log("ThirdWeb Active Wallet:", activeWallet);
    
    // Vérifier si window.ethereum existe et si des comptes sont connectés
    const checkEthereumConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            console.log("Ethereum accounts:", accounts);
            setIsConnected(true);
            setWalletAddress(accounts[0]);
            return true;
          }
        } catch (error) {
          console.error("Erreur lors de la vérification ethereum:", error);
        }
      }
      return false;
    };
    
    // Vérifier d'abord ThirdWeb
    if (activeAccount && activeAccount.address) {
      console.log("Connecté via ThirdWeb:", activeAccount.address);
      setIsConnected(true);
      setWalletAddress(activeAccount.address);
    } 
    // Sinon, vérifier window.ethereum
    else {
      checkEthereumConnection().then(connected => {
        if (!connected) {
          console.log("Non connecté");
          setIsConnected(false);
          setWalletAddress(null);
        }
      });
    }
  }, [activeAccount, activeWallet]);
  
  // Écouter les changements d'état de connexion Ethereum
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }
    
    const handleAccountsChanged = (accounts: string[]) => {
      console.log("Ethereum accounts changed:", accounts);
      if (accounts.length > 0) {
        setIsConnected(true);
        setWalletAddress(accounts[0]);
      } else {
        setIsConnected(false);
        setWalletAddress(null);
      }
    };
    
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);
  
  // Valeur du contexte
  const value = {
    isConnected,
    walletAddress,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
