import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Download, RefreshCw } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { formatNumber } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/context/ThemeContext";
import { getBalances, withdraw } from "@/lib/mockBlockchain";
import { ethers } from "ethers";

export default function Balance() {
  const { isConnected, walletAddress } = useWallet();
  const { theme } = useTheme();
  const [ftnBalance, setFtnBalance] = useState<number>(0);
  const [lbrBalance, setLbrBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  
  // Fonction pour récupérer les soldes
  const fetchBalances = async () => {
    if (!isConnected || !walletAddress) return;
    
    try {
      setIsLoading(true);
      console.log("Récupération des soldes pour", walletAddress);
      
      // Récupérer les soldes depuis la blockchain
      const balances = await getBalances(walletAddress);
      console.log("Soldes récupérés:", balances);
      
      setFtnBalance(balances.ftnBalance);
      setLbrBalance(balances.lbrBalance);
    } catch (error) {
      console.error("Erreur lors de la récupération des soldes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer vos soldes.",
        variant: "destructive"
      });
      
      // En mode développement, utiliser des valeurs simulées
      if (import.meta.env.DEV) {
        setFtnBalance(100);
        setLbrBalance(50);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Récupérer les soldes lors du chargement et lorsque le wallet change
  useEffect(() => {
    fetchBalances();
  }, [isConnected, walletAddress]);
  
  // Fonction pour retirer les jetons
  const handleWithdraw = async () => {
    if (!isConnected) return;
    
    try {
      setIsWithdrawing(true);
      
      // Obtenir le provider depuis window.ethereum
      if (!window.ethereum) {
        throw new Error("MetaMask n'est pas installé");
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Appeler la fonction de retrait
      await withdraw(provider);
      
      toast({
        title: "Retrait réussi",
        description: "Vos fonds ont été retirés avec succès.",
        variant: "default"
      });
      
      // Rafraîchir les soldes
      await fetchBalances();
    } catch (error: any) {
      console.error("Erreur lors du retrait:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter votre demande de retrait.",
        variant: "destructive"
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Card className={`${theme === 'dark' ? 'bg-[#1E1E1E] text-white border-gray-700' : 'bg-white text-[#1E1E1E] border-gray-300'} rounded-2xl shadow-lg border-2 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,105,180,0.15),transparent_70%)] z-0"></div>
      <CardContent className="p-6 relative z-10">
        <h2 className={`text-xl font-semibold mb-4 flex items-center ${theme === 'dark' ? 'text-white' : 'text-[#1E1E1E]'}`}>
          <DollarSign className="h-5 w-5 text-[#FF69B4] mr-2" />
          Your Balance
        </h2>
        
        {isConnected ? (
          <div className={`mb-4 ${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} rounded-xl p-4 space-y-2 border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} relative`}>
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-xl">
                <RefreshCw className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500">Adresse: {walletAddress && `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-6 w-6" 
                onClick={fetchBalances}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 mr-2 shadow-sm"></span>
                <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>FTN</span>
              </span>
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-[#1E1E1E]'}`}>{formatNumber(ftnBalance)}</span>
            </p>
            <p className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 mr-2 shadow-sm"></span>
                <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>LBR</span>
              </span>
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-[#1E1E1E]'}`}>{formatNumber(lbrBalance)}</span>
            </p>
          </div>
        ) : (
          <div className={`mb-4 ${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} rounded-xl p-4 text-center border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>connect your wallet to see your balance</p>
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          <Button
            variant="outline"
            className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
            onClick={handleWithdraw}
            disabled={!isConnected || isWithdrawing}
          >
            {isWithdrawing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Retirer les fonds
              </>
            )}
          </Button>
          
          <a 
            href="https://ftnscan.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`text-center text-xs ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} mt-2 block`}
          >
            Explorer Bahamut Mainnet
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
