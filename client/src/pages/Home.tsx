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
import { placeBet, withdraw, getPendingBetInfo, getPendingWithdrawals, forceResetPendingBet, resolvePendingBet } from "../lib/mockBlockchain";
import { ethers } from "ethers";

export default function Home() {
  const { isConnected, walletAddress } = useWallet();
  const { theme } = useTheme();
  

  
  // State to track if a bet is pending resolution
  const [hasPendingBet, setHasPendingBet] = useState(false);
  // Reference to store the polling interval
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log("État de connexion dans Home:", { isConnected, walletAddress });
    
    // Check and retrieve winnings when the user connects
    if (isConnected && walletAddress) {
      checkForWinnings();
      // Immediately check if there is a pending bet
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

  // Function to check if there is a pending bet and start polling if necessary
  const checkForPendingBet = async () => {
    if (!isConnected || !walletAddress || !window.ethereum) return;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const pendingBetInfo = await getPendingBetInfo(provider, walletAddress);
      
      console.log("Initial check of pending bet:", pendingBetInfo);
      
      // If a bet is pending, start polling
      if (pendingBetInfo.isPending) {
        setHasPendingBet(true);
        startPollingForResults();
      } else {
        setHasPendingBet(false);
        // Make sure polling is stopped if no bet is pending
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error("Error checking pending bet:", error);
    }
  };

  // Function to start polling for results
  const startPollingForResults = () => {
    // Avoid creating multiple intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log("Starting polling for VRF oracle results...");
    
    // Check every 10 seconds if the result is available
    pollingIntervalRef.current = setInterval(async () => {
      console.log("Polling: checking bet result...");
      const resultAvailable = await checkBetResultAndSpin();
      
      if (resultAvailable) {
        console.log("Result available, stopping polling");
        setHasPendingBet(false);
        // Stop polling once the result is available
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 10000); // 10 seconds
  };
  
  // Function to check and retrieve winnings
  const checkForWinnings = async () => {
    try {
      console.log("Checking pending winnings...");
      const result = await checkAndClaimWinnings();
      
      if (result.hasResolved) {
        // Display a success message with the winnings
        let message = "";
        
        if (result.result === "win") {
          if (result.ftnDelta > 0) {
            message = `You won ${result.ftnDelta} FTN!`;
          } else if (result.lbrDelta > 0) {
            message = `You won ${result.lbrDelta} LBR!`;
          }
        } else {
          message = "Your previous bet has been resolved.";
        }
        
        toast({
          title: "Bet resolved",
          description: message,
          variant: result.result === "win" ? "default" : "destructive"
        });
        
        // Update the user interface if necessary
        setResultColor(result.resultColor || null);
        setSpinResult(result.result || null);
        setResultMessage(message);
        setShowResult(true);
      } else {
        console.log("No pending bet to resolve.");
      }
    } catch (error) {
      console.error("Error checking winnings:", error);
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
  
  // Function to place a bet without spinning the wheel
  const placeBetOnly = async () => {
    console.log("Attempting to place bet, connection state:", { isConnected, walletAddress });
    
    if (!isConnected) {
      console.log("Bet blocked: Not connected");
      return false;
    }
    
    if (bet.amount === null || bet.color === null) {
      console.log("Bet blocked: Amount or color not selected");
      return false;
    }
    
    try {
      // First check if there is already a pending bet
      if (hasPendingBet) {
        toast({
          title: "Pending bet",
          description: "You already have a pending bet. Wait for the result before placing a new bet.",
          variant: "destructive"
        });
        return false;
      }
      
      // Display a toast to indicate that the transaction is in progress
      toast({
        title: "Transaction in progress",
        description: "Please confirm the transaction in your wallet...",
        variant: "default"
      });
      
      console.log("Sending transaction to the blockchain...");
      
      // Get the provider
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      
      try {
        // Place the bet on the blockchain - this will trigger MetaMask popup
        const response = await placeBet(
          provider,
          bet.color === "red", // true for red, false for black
          bet.amount as number,
          bet.token !== "LBR" // true for FTN, false for LBR
        );
        
        console.log("Blockchain response:", response);
        
        // Mark that a bet is pending and start polling
        setHasPendingBet(true);
        startPollingForResults();
        
        // Display a toast to indicate that the transaction is confirmed
        toast({
          title: "Transaction confirmed",
          description: "Your bet has been successfully placed. The wheel will spin automatically as soon as the result is available.",
          variant: "default"
        });
        
        // After a short delay, simulate the wheel spinning
        setTimeout(() => {
          // Generate a random result for demonstration purposes
          const randomResult: SpinResult = Math.random() > 0.5 ? "win" : "loss";
          const randomColor: ResultColor = Math.random() > 0.5 ? "red" : "black";
          
          // Spin the wheel with the random result
          spinRouletteWithResult(randomResult, randomColor);
        }, 5000); // Wait 5 seconds before spinning
        
        return true;
      } catch (error: any) {
        console.error("Error during transaction:", error);
        
        // Check if the user rejected the transaction in MetaMask
        if (error.message.includes("rejected")) {
          toast({
            title: "Transaction rejected",
            description: "You rejected the transaction in MetaMask.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Transaction error",
            description: error.message || "An error occurred during the transaction.",
            variant: "destructive"
          });
        }
        
        return false;
      }
    } catch (error: any) {
      console.error("Error placing bet:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while placing the bet.",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Function to check the bet result and spin the wheel
  const checkBetResultAndSpin = async () => {
    try {
      if (!window.ethereum || !walletAddress) {
        return false;
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const pendingBetInfo = await getPendingBetInfo(provider, walletAddress);
      
      // If there is a pending bet, we need to wait for the result
      if (pendingBetInfo.isPending) {
        console.log("Pending bet found, waiting for result...");
        return false;
      }
      
      // If no pending bet, check if there are winnings to withdraw
      const withdrawalInfo = await getPendingWithdrawals(provider, walletAddress);
      
      if (withdrawalInfo.hasPendingWithdrawal) {
        // There are winnings to withdraw, the bet has been resolved
        console.log("The bet has been resolved. Available winnings:", withdrawalInfo);
        
        // Determine if it's a win or a loss based on winnings
        const result: SpinResult = (withdrawalInfo.ftnAmount > 0 || withdrawalInfo.lbrAmount > 0) ? "win" : "loss";
        
        // Determine the result color (simplified - in reality, we should get this information from the event)
        // For now, we assume that if it's a win, the color matches the bet color
        const resultColor: ResultColor = result === "win" ? (bet.color as ResultColor) : (bet.color === "red" ? "black" : "red");
        
        // Spin the wheel with the obtained result
        await spinRouletteWithResult(result, resultColor);
        
        // Automatically withdraw winnings
        try {
          await withdraw(provider);
          toast({
            title: "Winnings withdrawn",
            description: "Your winnings have been successfully withdrawn to your wallet.",
            variant: "default"
          });
        } catch (error: any) {
          console.error("Error withdrawing winnings:", error);
          if (error.message.includes("rejected")) {
            toast({
              title: "Transaction rejected",
              description: "You rejected the withdrawal transaction in MetaMask.",
              variant: "destructive"
            });
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking bet result:", error);
      return false;
    }
  };
  
  // Function to spin the wheel with a specific result
  const spinRouletteWithResult = async (result: SpinResult, resultColor: ResultColor) => {
    setIsSpinning(true);
    
    // Display a toast to indicate that the result is available
    toast({
      title: "Result available",
      description: "The wheel will spin to reveal the result...",
      variant: "default"
    });
    
    console.log("Spinning wheel with result:", { result, resultColor });
    
    // Simulate the wheel animation
    // In a real implementation, you would animate the wheel to land on the correct number
    // For now, we'll just simulate a delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update the state with the result
    setSpinResult(result);
    setResultColor(resultColor);
    
    // Create a result message
    let message = "";
    const betAmount = bet.amount || 0;
    
    if (result === "win") {
      message = `You won ${betAmount * 2} ${bet.token}!`;
      
      // Play a winning sound
      const winSound = new Audio("/sounds/win.mp3");
      winSound.volume = 0.5;
      winSound.play().catch(e => console.error("Error playing sound:", e));
    } else if (result === "loss") {
      message = `You lost ${betAmount} ${bet.token}.`;
      
      // Play a losing sound
      const loseSound = new Audio("/sounds/lose.mp3");
      loseSound.volume = 0.5;
      loseSound.play().catch(e => console.error("Error playing sound:", e));
    } else {
      message = `Your bet of ${betAmount} ${bet.token} is pending resolution.`;
    }
    
    setResultMessage(message);
    setShowResult(true);
    
    // Clear the pending bet status
    setHasPendingBet(false);
    
    // Refresh the balances after a delay
    setTimeout(() => {
      checkForWinnings();
    }, 2000);
    
    setIsSpinning(false);
  };
  
  // Main function to handle the spin
  const handleSpin = async () => {
    console.log("Attempting to spin, connection state:", { isConnected, walletAddress });
    
    if (isSpinning) {
      console.log("Spin blocked: Already spinning");
      return;
    }
    
    // If a bet is already pending, manually check if a result is available
    if (hasPendingBet) {
      toast({
        title: "Checking result",
        description: "Checking the result of your current bet...",
        variant: "default"
      });
      
      const resultAvailable = await checkBetResultAndSpin();
      
      if (!resultAvailable) {
        toast({
          title: "Result not available",
          description: "The result of your bet is not yet available. The wheel will spin automatically as soon as the result is ready.",
          variant: "default",
          duration: 5000
        });
      }
      return;
    }
    
    // Otherwise, place a new bet
    const betPlaced = await placeBetOnly();
    
    if (betPlaced) {
      // The message is now handled in placeBetOnly
    }
  };
  

  
  // Function to reset a blocked bet
  const handleResetPendingBet = async () => {
    if (!isConnected || !walletAddress || !window.ethereum) {
      toast({
        title: "Not connected",
        description: "Please connect your wallet to reset a blocked bet.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      toast({
        title: "Reset in progress",
        description: "Attempting to reset the blocked bet...",
        variant: "default"
      });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const success = await forceResetPendingBet(provider, walletAddress);
      
      if (success) {
        toast({
          title: "Reset successful",
          description: "The blocked bet has been successfully reset.",
          variant: "default"
        });
        
        // Update the state
        setHasPendingBet(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Check if there are winnings to withdraw
        checkForWinnings();
      } else {
        toast({
          title: "Reset failed",
          description: "Unable to reset the blocked bet. Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error resetting the blocked bet:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while resetting the bet.",
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
                
                {/* Button to reset a blocked bet - only visible if a bet is pending */}
                {hasPendingBet && (
                  <button
                    onClick={handleResetPendingBet}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    RESET BLOCKED BET
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Game Info and Transaction History side by side on large screens */}
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
