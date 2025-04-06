import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getBalances, getProviderAndSigner } from '@/lib/blockchain';

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

// Import uniquement le type Token
type Token = "FTN" | "LBR";

interface UseThirdwebWalletResult {
  address: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  mockUserId: number | null;
  ftnBalance: number;
  lbrBalance: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  ThirdwebConnectButton: () => JSX.Element;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
}

interface BalanceResponse {
  ftnBalance: number;
  lbrBalance: number;
}

export function useThirdwebWallet(): UseThirdwebWalletResult {
  const [address, setAddress] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connecting" | "connected" | "disconnected">("unknown");
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [mockUserId, setMockUserId] = useState<number | null>(1); // For development purposes
  const [ftnBalance, setFtnBalance] = useState(0);
  const [lbrBalance, setLbrBalance] = useState(0);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

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

  // Gestion de connexion wrapper
  const handleConnect = async (): Promise<void> => {
    if (connectionStatus !== "connected") {
      setIsConnecting(true);
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            setConnectionStatus("connected");
            
            // Initialiser provider et signer
            const { provider: web3Provider, signer: web3Signer } = await getProviderAndSigner();
            setProvider(web3Provider);
            setSigner(web3Signer);
          }
        } else {
          console.error("No Ethereum provider found");
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  // Déconnexion
  const handleDisconnect = () => {
    setAddress(null);
    setConnectionStatus("disconnected");
    // Note: La plupart des wallets ne supportent pas une vraie déconnexion via API
    // C'est généralement géré par l'interface du wallet lui-même
  };

  // Rafraîchir le solde
  const refreshBalance = async (): Promise<void> => {
    if (!address) return;
    
    try {
      // Obtenir les soldes réels depuis la blockchain
      const balances = await getBalances(address);
      
      setFtnBalance(balances.ftnBalance);
      setLbrBalance(balances.lbrBalance);
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  };

  // Charger le solde initial
  useEffect(() => {
    if (address) {
      refreshBalance();
    }
  }, [address]);

  // Composant de connexion - version simplifiée sans ThirdWeb
  const ThirdwebConnectButton = () => {
    const [truncatedAddress, setTruncatedAddress] = useState<string>('');
    
    // Tronquer l'adresse pour l'affichage
    useEffect(() => {
      if (address) {
        const start = address.substring(0, 6);
        const end = address.substring(address.length - 4);
        setTruncatedAddress(`${start}...${end}`);
      }
    }, [address]);
    
    // Styles pour le bouton
    const buttonStyle = {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    };
    
    // Style pour l'adresse tronquée
    const addressStyle = {
      backgroundColor: '#1e40af',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontSize: '0.875rem'
    };
    
    return (
      <button 
        style={buttonStyle as React.CSSProperties}
        onClick={connectionStatus === "connected" ? handleDisconnect : handleConnect}
      >
        {connectionStatus === "connected" ? (
          <>
            <span>Connecté</span>
            <span style={addressStyle as React.CSSProperties}>{truncatedAddress}</span>
          </>
        ) : (
          'Connecter Wallet'
        )}
      </button>
    );
  };

  return {
    address,
    isConnecting,
    isConnected: connectionStatus === "connected",
    mockUserId,
    ftnBalance,
    lbrBalance,
    connect: handleConnect,
    disconnect: handleDisconnect,
    refreshBalance,
    ThirdwebConnectButton,
    provider,
    signer
  };
}