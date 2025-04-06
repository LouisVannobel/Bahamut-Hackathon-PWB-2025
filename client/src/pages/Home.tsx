import React, { useEffect } from "react";
import GameInfo from "@/components/GameInfo";
import Balance from "@/components/Balance";
import RouletteWheel from "@/components/RouletteWheel";
import BettingOptions from "@/components/BettingOptions";
import TransactionHistory from "@/components/TransactionHistory";
import ResultOverlay from "@/components/ResultOverlay";
import Layout from "@/components/Layout";
import { useWallet } from "@/context/WalletContext";
import { Bet, BetColor, BetAmount, Token, SpinResult, ResultColor, checkAndClaimWinnings } from "@/lib/roulette";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { placeBet, withdraw, getPendingBetInfo, getPendingWithdrawals, forceResetPendingBet } from "../lib/blockchain";
import { ethers } from "ethers";

export default function Home() {
  const { isConnected, walletAddress } = useWallet();
  const { theme } = useTheme();
  

  
  // État pour suivre si un pari est en attente de résolution
  const [hasPendingBet, setHasPendingBet] = useState(false);
  // Référence pour stocker l'intervalle de polling
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log("État de connexion dans Home:", { isConnected, walletAddress });
    
    // Vérifier et récupérer les gains lorsque l'utilisateur se connecte
    if (isConnected && walletAddress) {
      checkForWinnings();
      // Vérifier immédiatement s'il y a un pari en attente
      checkForPendingBet();
    }

    // Nettoyage de l'intervalle lors du démontage du composant
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isConnected, walletAddress]);

  // Fonction pour vérifier s'il y a un pari en attente et démarrer le polling si nécessaire
  const checkForPendingBet = async () => {
    if (!isConnected || !walletAddress || !window.ethereum) return;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const pendingBetInfo = await getPendingBetInfo(provider, walletAddress);
      
      console.log("Vérification initiale du pari en attente:", pendingBetInfo);
      
      // Si un pari est en attente, démarrer le polling
      if (pendingBetInfo.isPending) {
        setHasPendingBet(true);
        startPollingForResults();
      } else {
        setHasPendingBet(false);
        // S'assurer que le polling est arrêté si aucun pari n'est en attente
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du pari en attente:", error);
    }
  };

  // Fonction pour démarrer le polling des résultats
  const startPollingForResults = () => {
    // Éviter de créer plusieurs intervalles
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log("Démarrage du polling pour les résultats de l'oracle VRF...");
    
    // Vérifier toutes les 10 secondes si le résultat est disponible
    pollingIntervalRef.current = setInterval(async () => {
      console.log("Polling: vérification du résultat du pari...");
      const resultAvailable = await checkBetResultAndSpin();
      
      if (resultAvailable) {
        console.log("Résultat disponible, arrêt du polling");
        setHasPendingBet(false);
        // Arrêter le polling une fois que le résultat est disponible
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 10000); // 10 secondes
  };
  
  // Fonction pour vérifier et récupérer les gains
  const checkForWinnings = async () => {
    try {
      console.log("Vérification des gains en attente...");
      const result = await checkAndClaimWinnings();
      
      if (result.hasResolved) {
        // Afficher un message de succès avec les gains
        let message = "";
        
        if (result.result === "win") {
          if (result.ftnDelta > 0) {
            message = `Vous avez gagné ${result.ftnDelta} FTN!`;
          } else if (result.lbrDelta > 0) {
            message = `Vous avez gagné ${result.lbrDelta} LBR!`;
          }
        } else {
          message = "Votre pari précédent a été résolu.";
        }
        
        toast({
          title: "Pari résolu",
          description: message,
          variant: result.result === "win" ? "default" : "destructive"
        });
        
        // Mettre à jour l'interface utilisateur si nécessaire
        setResultColor(result.resultColor || null);
        setSpinResult(result.result || null);
        setResultMessage(message);
        setShowResult(true);
      } else {
        console.log("Aucun pari en attente à résoudre.");
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des gains:", error);
    }
  };
  
  const [bet, setBet] = useState<Bet>({
    amount: null,
    token: "FTN",
    color: null,
  });
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [resultColor, setResultColor] = useState<ResultColor | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  
  const handleBetAmountChange = (amount: BetAmount | null) => {
    setBet((prevBet) => ({ ...prevBet, amount }));
  };
  
  const handleTokenChange = (token: Token) => {
    setBet((prevBet) => ({ ...prevBet, token }));
  };
  
  const handleColorChange = (color: BetColor | null) => {
    setBet((prevBet) => ({ ...prevBet, color }));
  };
  
  // Fonction pour placer un pari sans faire tourner la roue
  const placeBetOnly = async () => {
    console.log("Tentative de placement de pari, état de connexion:", { isConnected, walletAddress });
    
    if (!isConnected) {
      console.log("Pari bloqué: Non connecté");
      return false;
    }
    
    if (bet.amount === null || bet.color === null) {
      console.log("Pari bloqué: Montant ou couleur non sélectionnés");
      return false;
    }
    
    try {
      // Vérifier d'abord s'il y a déjà un pari en attente
      if (hasPendingBet) {
        toast({
          title: "Pari en attente",
          description: "Vous avez déjà un pari en attente. Attendez le résultat avant de placer un nouveau pari.",
          variant: "destructive"
        });
        return false;
      }
      
      // Afficher un toast pour indiquer que la transaction est en cours
      toast({
        title: "Transaction en cours",
        description: "Veuillez confirmer la transaction dans votre wallet...",
        variant: "default"
      });
      
      console.log("Envoi de la transaction à la blockchain...");
      
      // Obtenir le provider
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      
      // Placer le pari sur la blockchain
      const response = await placeBet(
        provider,
        bet.color === "red", // true pour rouge, false pour noir
        bet.amount as number,
        bet.token === "LBR" // true pour LBR, false pour FTN
      );
      
      console.log("Réponse de la blockchain:", response);
      
      // Marquer qu'un pari est en attente et démarrer le polling
      setHasPendingBet(true);
      startPollingForResults();
      
      // Afficher un toast pour indiquer que la transaction est confirmée
      toast({
        title: "Transaction confirmée",
        description: "Votre pari a été placé avec succès. La roue tournera automatiquement dès que le résultat sera disponible.",
        variant: "default"
      });
      
      return true;
    } catch (error: any) {
      console.error("Error placing bet:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors du placement du pari.",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Fonction pour vérifier le résultat du pari et faire tourner la roue
  const checkBetResultAndSpin = async () => {
    try {
      if (!window.ethereum || !walletAddress) {
        return;
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const pendingBetInfo = await getPendingBetInfo(provider, walletAddress);
      
      // Si aucun pari en attente, vérifier s'il y a des gains à retirer
      if (!pendingBetInfo.isPending) {
        const withdrawalInfo = await getPendingWithdrawals(provider, walletAddress);
        
        if (withdrawalInfo.hasPendingWithdrawal) {
          // Il y a des gains à retirer, le pari a été résolu
          console.log("Le pari a été résolu. Gains disponibles:", withdrawalInfo);
          
          // Déterminer si c'est une victoire ou une perte en fonction des gains
          const result: SpinResult = (withdrawalInfo.ftnAmount > 0 || withdrawalInfo.lbrAmount > 0) ? "win" : "loss";
          
          // Déterminer la couleur du résultat (simplifié - en réalité, nous devrions obtenir cette information de l'événement)
          // Pour l'instant, nous supposons que si c'est une victoire, la couleur correspond à la couleur du pari
          const resultColor: ResultColor = result === "win" ? (bet.color as ResultColor) : (bet.color === "red" ? "black" : "red");
          
          // Faire tourner la roue avec le résultat obtenu
          await spinRouletteWithResult(result, resultColor);
          
          // Retirer les gains automatiquement
          await withdraw(provider);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Erreur lors de la vérification du résultat du pari:", error);
      return false;
    }
  };
  
  // Fonction pour faire tourner la roue avec un résultat spécifique
  const spinRouletteWithResult = async (result: SpinResult, resultColor: ResultColor) => {
    setIsSpinning(true);
    
    // Afficher un toast pour indiquer que la roulette va tourner
    toast({
      title: "Résultat disponible",
      description: "La roulette va tourner pour révéler le résultat...",
      variant: "default"
    });
    
    // Simuler un délai pour l'animation de la roulette
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mettre à jour l'état avec le résultat
    setSpinResult(result);
    setResultColor(resultColor);
    
    // Créer un message de résultat
    let message = "";
    const betAmount = bet.amount || 0;
    
    if (result === "win") {
      message = `Vous avez gagné ${betAmount * 2} ${bet.token}!`;
    } else if (result === "loss") {
      message = `Vous avez perdu ${betAmount} ${bet.token}.`;
    } else {
      message = `Votre pari de ${betAmount} ${bet.token} est en attente de résolution.`;
    }
    
    setResultMessage(message);
    setShowResult(true);
    
    // Rafraîchir les soldes après un délai
    setTimeout(() => {
      checkForWinnings();
    }, 2000);
    
    setIsSpinning(false);
  };
  
  // Fonction principale pour gérer le spin
  const handleSpin = async () => {
    console.log("Tentative de spin, état de connexion:", { isConnected, walletAddress });
    
    if (isSpinning) {
      console.log("Spin bloqué: Déjà en train de tourner");
      return;
    }
    
    // Si un pari est déjà en attente, vérifier manuellement s'il y a un résultat disponible
    if (hasPendingBet) {
      toast({
        title: "Vérification du résultat",
        description: "Vérification du résultat de votre pari en cours...",
        variant: "default"
      });
      
      const resultAvailable = await checkBetResultAndSpin();
      
      if (!resultAvailable) {
        toast({
          title: "Résultat non disponible",
          description: "Le résultat de votre pari n'est pas encore disponible. La roue tournera automatiquement dès que le résultat sera prêt.",
          variant: "default",
          duration: 5000
        });
      }
      return;
    }
    
    // Sinon, placer un nouveau pari
    const betPlaced = await placeBetOnly();
    
    if (betPlaced) {
      // Le message est maintenant géré dans placeBetOnly
    }
  };
  

  
  // Fonction pour réinitialiser un pari bloqué
  const handleResetPendingBet = async () => {
    if (!isConnected || !walletAddress || !window.ethereum) {
      toast({
        title: "Non connecté",
        description: "Veuillez connecter votre wallet pour réinitialiser un pari bloqué.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      toast({
        title: "Réinitialisation en cours",
        description: "Tentative de réinitialisation du pari bloqué...",
        variant: "default"
      });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const success = await forceResetPendingBet(provider, walletAddress);
      
      if (success) {
        toast({
          title: "Réinitialisation réussie",
          description: "Le pari bloqué a été réinitialisé avec succès.",
          variant: "default"
        });
        
        // Mettre à jour l'état
        setHasPendingBet(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Vérifier s'il y a des gains à récupérer
        checkForWinnings();
      } else {
        toast({
          title: "Échec de la réinitialisation",
          description: "Impossible de réinitialiser le pari bloqué. Veuillez réessayer plus tard.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Erreur lors de la réinitialisation du pari bloqué:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la réinitialisation du pari.",
        variant: "destructive"
      });
    }
  };
  
  const handleCloseResult = () => {
    setShowResult(false);
    setSpinResult(null);
    setResultColor(null);
  };
  
  return (
    <Layout>
      <div className="w-full max-w-[1800px] mx-auto px-4 md:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            <div className="rounded-2xl overflow-hidden">
              <BettingOptions
                bet={bet}
                onBetAmountChange={handleBetAmountChange}
                onTokenChange={handleTokenChange}
                onColorChange={handleColorChange}
                disabled={isSpinning}
              />
            </div>
            
            <div className="rounded-2xl overflow-hidden">
              <Balance />
            </div>
          </div>
          
          <div className="lg:col-span-8 flex flex-col items-center justify-center order-1 lg:order-2 px-6 md:px-12">
            <div className="relative w-full max-w-[60%] lg:max-w-[65%] mx-auto">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary-light),transparent_70%)] opacity-30 blur-3xl z-0"></div>
              <div className="w-full aspect-square flex items-center justify-center">
                <RouletteWheel 
                  isSpinning={isSpinning} 
                  resultColor={resultColor}
                  result={spinResult}
                  resultMessage={resultMessage}
                />
              </div>
            </div>
            
            <div className="mt-8 text-center w-full max-w-md">
              <div
                className={`text-2xl font-bold mb-3 h-10 flex items-center justify-center ${
                  spinResult === "win" ? "text-green-400" : spinResult === "loss" ? "text-red-400" : ""
                }`}
              >
                {!isSpinning && spinResult && resultMessage}
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSpin}
                  disabled={!isConnected || bet.amount === null || bet.color === null || isSpinning}
                  className="relative w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:from-[var(--secondary)] hover:to-[var(--primary)] text-white text-xl font-bold py-4 px-10 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {isSpinning ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        SPINNING...
                      </div>
                    ) : (
                      <span>SPIN THE WHEEL</span>
                    )}
                  </span>
                </button>
                
                {/* Bouton pour réinitialiser un pari bloqué - visible uniquement si un pari est en attente */}
                {hasPendingBet && (
                  <button
                    onClick={handleResetPendingBet}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    RÉINITIALISER LE PARI BLOQUÉ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Game Info et Transaction History côte à côte sur les grands écrans */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Game Info */}
          <div className="rounded-2xl overflow-hidden">
            <GameInfo />
          </div>
          
          {/* Transaction History */}
          <div className="rounded-2xl overflow-hidden">
            <TransactionHistory />
          </div>
        </div>
      </div>
      
      {/* Result Overlay */}
      {showResult && (
        <ResultOverlay
          show={showResult}
          message={resultMessage}
          result={resultColor}
          onClose={handleCloseResult}
        />
      )}
    </Layout>
  );
}
