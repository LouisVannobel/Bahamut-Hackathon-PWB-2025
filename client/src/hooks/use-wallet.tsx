import { useEffect, useState } from "react";

// Définir le type pour window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");
  
  useEffect(() => {
    // Vérifier si un wallet est déjà connecté au chargement
    const checkConnection = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            setConnectionStatus("connected");
          } else {
            setConnectionStatus("disconnected");
          }
        } else {
          setConnectionStatus("disconnected");
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
        setConnectionStatus("disconnected");
      }
    };
    
    if (typeof window !== 'undefined' && window.ethereum) {
      checkConnection();
      
      // Écouter les changements de compte
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnectionStatus("connected");
        } else {
          setAddress(null);
          setConnectionStatus("disconnected");
        }
      });
    } else {
      setConnectionStatus("disconnected");
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);
  
  // Fonction pour connecter le wallet
  const connect = async () => {
    try {
      setConnectionStatus("connecting");
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnectionStatus("connected");
        }
      } else {
        console.error("No Ethereum provider found. Please install MetaMask or another wallet.");
        setConnectionStatus("disconnected");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setConnectionStatus("disconnected");
    }
  };
  
  // Fonction pour déconnecter le wallet
  const disconnect = async () => {
    try {
      // Note: La plupart des wallets ne supportent pas une vraie déconnexion via API
      // C'est généralement géré par l'interface du wallet lui-même
      setAddress(null);
      setConnectionStatus("disconnected");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };
  
  // Vérifie si le wallet est connecté
  const isConnected = connectionStatus === "connected";
  
  return {
    address,
    isConnected,
    connect,
    disconnect,
    connectionStatus,
  };
}