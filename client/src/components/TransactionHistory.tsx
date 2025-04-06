import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, RefreshCw } from "lucide-react";
import { getTransactionHistory, Transaction } from "@/lib/roulette";
import { useWallet } from "@/context/WalletContext";
import { getRelativeTime } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

export default function TransactionHistory() {
  const { isConnected, walletAddress } = useWallet();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour récupérer l'historique des transactions
  const fetchTransactions = async () => {
    if (!isConnected || !walletAddress) return;
    
    setIsLoading(true);
    try {
      console.log("Récupération de l'historique des transactions pour", walletAddress);
      const history = await getTransactionHistory(walletAddress, 10);
      console.log("Historique récupéré:", history);
      setTransactions(history);
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique des transactions:", error);
      // En mode développement, utiliser des données simulées
      if (import.meta.env.DEV) {
        const mockTransactions: Transaction[] = [
          { id: '1', timestamp: Date.now() - 1000 * 60 * 5, betAmount: 0.1, betToken: 'FTN', betColor: 'red', result: 'win', resultColor: 'red', txHash: '0x123...' },
          { id: '2', timestamp: Date.now() - 1000 * 60 * 15, betAmount: 0.2, betToken: 'LBR', betColor: 'black', result: 'loss', resultColor: 'red', txHash: '0x456...' },
          { id: '3', timestamp: Date.now() - 1000 * 60 * 60, betAmount: 0.5, betToken: 'FTN', betColor: 'red', result: 'win', resultColor: 'red', txHash: '0x789...' },
        ];
        setTransactions(mockTransactions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Charger l'historique des transactions lorsque le wallet est connecté
  useEffect(() => {
    fetchTransactions();
    
    // Rafraîchir les transactions toutes les 30 secondes
    const interval = setInterval(fetchTransactions, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isConnected, walletAddress]);

  return (
    <Card className={`${theme === 'dark' ? 'bg-[#1E1E1E] text-white border-gray-700' : 'bg-white text-[#1E1E1E] border-gray-300'} rounded-2xl shadow-lg border-2 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,105,180,0.1),transparent_70%)] z-0"></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold flex items-center ${theme === 'dark' ? 'text-white' : 'text-[#1E1E1E]'}`}>
            <Clock className="h-5 w-5 text-[#FF69B4] mr-2" />
            Recent Transactions
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 h-8 w-8" 
            onClick={fetchTransactions}
            disabled={isLoading || !isConnected}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className={`space-y-3 text-sm max-h-60 overflow-y-auto ${theme === 'dark' ? 'scrollbar-dark' : 'scrollbar-light'}`}>
          {!isConnected ? (
            <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center italic p-3 ${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              Connectez votre wallet pour voir vos transactions
            </div>
          ) : isLoading ? (
            <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center p-3 ${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} flex items-center justify-center`}>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Chargement des transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center italic p-3 ${theme === 'dark' ? 'bg-[#0D0D0D]' : 'bg-gray-100'} rounded-xl border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              Aucune transaction pour le moment
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className={`p-3 border-2 ${theme === 'dark' ? 'border-gray-700 bg-[#0D0D0D]' : 'border-gray-300 bg-gray-100'} rounded-xl flex flex-col mb-2`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className={`font-medium ${tx.result === "win" ? "text-green-500" : "text-red-500"} mr-2`}>
                      {tx.result === "win" ? "Gagné" : "Perdu"}
                    </span>
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {tx.betAmount} {tx.betToken} sur {tx.betColor === 'red' ? 'rouge' : tx.betColor === 'black' ? 'noir' : tx.betColor}
                    </span>
                  </div>
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{getRelativeTime(tx.timestamp)}</div>
                </div>
                {tx.txHash && (
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    <a 
                      href={`https://ftnscan.com/tx/${tx.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-blue-500"
                    >
                      TX: {tx.txHash.substring(0, 10)}...{tx.txHash.substring(tx.txHash.length - 8)}
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
