// Types for roulette game
export type Token = "FTN" | "LBR";
export type BetColor = "red" | "black";
export type BetAmount = 0.1 | 0.5 | 1 | 5 | 10 | 25;
// Bet result: win, loss or pending resolution
export type SpinResult = "win" | "loss" | "pending";
// Color where the ball stopped: red, black or green (0)
export type ResultColor = "red" | "black" | "green";

export interface Bet {
  amount: BetAmount | null;
  token: Token;
  color: BetColor | null;
}

export interface Transaction {
  id: string;
  betAmount: number;
  betToken: string;
  betColor: string;
  result: SpinResult;
  resultColor?: ResultColor;
  timestamp: number;
  txHash?: string;
}

export interface SpinResponse {
  result: SpinResult;
  resultColor: ResultColor;
  ftnDelta: number;
  lbrDelta: number;
  updatedBalances: {
    ftnBalance: number;
    lbrBalance: number;
  };
  ftnBalance: number;
  lbrBalance: number;
  transaction: Transaction;
}

import { placeBet as blockchainPlaceBet, getBalances, getPendingBetInfo, resolvePendingBet, PendingBetInfo, getPendingWithdrawals, PendingWithdrawalInfo, getTransactionHistory as getMockTransactionHistory } from './mockBlockchain';
import { ethers } from 'ethers';

export async function placeBet(
  userId: number,
  betAmount: number,
  betToken: Token,
  betColor: BetColor
): Promise<SpinResponse> {
  try {
    // Get provider from window.ethereum
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const address = await provider.getSigner().getAddress();
    
    // Check if there are pending withdrawals to claim
    const withdrawalInfo = await getPendingWithdrawals(provider, address);
    
    if (withdrawalInfo.hasPendingWithdrawal) {
      try {
        // Automatically retrieve winnings
        await resolvePendingBet(provider, address);
        console.log("Winnings automatically claimed.");
      } catch (error) {
        console.warn("Error claiming winnings, but we continue", error);
      }
    }
    
    // Convert bet color to boolean (true for red, false for black)
    const betOnRed = betColor === "red";
    
    // Place the bet on the blockchain
    const receipt = await blockchainPlaceBet(
      provider,
      betOnRed,
      betAmount,
      betToken === "FTN"
    );
    
    // Get updated balances
    const { ftnBalance, lbrBalance } = await getBalances(address);
    
    // Create a transaction for history (the actual result will be determined by the oracle)
    const transaction: Transaction = {
      id: `tx_${Math.floor(Math.random() * 1000000)}`,
      betAmount,
      betToken,
      betColor,
      result: "pending", // Result is pending
      resultColor: "green", // Temporary color before knowing the actual result (red, black, or green/zero)
      timestamp: Date.now(),
      txHash: receipt?.txHash
    };
    
    // Return the response
    return {
      result: "pending", // Result is pending
      resultColor: "green", // Temporary color before knowing the actual result (red, black, or green/zero)
      ftnDelta: 0, // No delta until the result is known
      lbrDelta: 0, // No delta until the result is known
      updatedBalances: {
        ftnBalance,
        lbrBalance
      },
      ftnBalance,
      lbrBalance,
      transaction
    };
  } catch (error: any) {
    console.error("Error placing bet:", error);
    throw new Error(error.message || "Failed to place bet");
  }
}

export async function getTransactionHistory(
  address: string,
  limit = 10
): Promise<Transaction[]> {
  try {
    console.log("Getting transaction history for address", address);
    
    // Use our mock blockchain implementation
    const mockTransactions = getMockTransactionHistory(address);
    
    // Convert TransactionHistory[] to Transaction[]
    const transactions: Transaction[] = mockTransactions.map(tx => ({
      id: tx.id,
      betAmount: tx.amount,
      betToken: tx.token,
      betColor: tx.color || 'red', // Default to red if color is not available
      result: tx.type as SpinResult, // 'win', 'loss', or 'pending'
      resultColor: tx.resultColor as ResultColor || 'green',
      timestamp: tx.timestamp,
      txHash: tx.txHash
    }));
    
    // Sort by timestamp (newest first) and limit
    return transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }
}

// Fonction pour générer des transactions simulées
function generateMockTransactions(limit: number): Transaction[] {
  const mockTransactions: Transaction[] = [];
  
  for (let i = 0; i < limit; i++) {
    const betToken: Token = Math.random() > 0.5 ? "FTN" : "LBR";
    const betColor: BetColor = Math.random() > 0.5 ? "red" : "black";
    const result: SpinResult = Math.random() > 0.5 ? "win" : "loss";
    const resultColor: ResultColor = Math.random() > 0.5 ? "red" : "black";
    
    mockTransactions.push({
      id: `tx_${i + 1}`,
      betAmount: Math.floor(Math.random() * 10 * 100) / 100,
      betToken,
      betColor,
      result,
      resultColor,
      timestamp: Date.now() - i * 1000 * 60 * 60,
      txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`
    });
  }
  
  return mockTransactions;
}

// Interface for resolved bet information
export interface ResolvedBetInfo {
  hasResolved: boolean;
  result?: SpinResult;
  resultColor?: ResultColor;
  ftnDelta: number;
  lbrDelta: number;
  ftnBalance: number;
  lbrBalance: number;
}

// Function to check and claim winnings from a resolved bet
export async function checkAndClaimWinnings(): Promise<ResolvedBetInfo> {
  try {
    // Always interact with our mock blockchain
    // Get provider from window.ethereum
    if (!window.ethereum) {
      console.warn("MetaMask is not installed, unable to check winnings");
      return {
        hasResolved: false,
        ftnDelta: 0,
        lbrDelta: 0,
        ftnBalance: 0,
        lbrBalance: 0
      };
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const address = await provider.getSigner().getAddress();
    
    try {
      // Check if there are pending withdrawals
      const withdrawalInfo = await getPendingWithdrawals(provider, address);
      
      // If we have winnings to withdraw, the bet has been resolved
      if (withdrawalInfo.hasPendingWithdrawal) {
        try {
          // Retrieve winnings
          await resolvePendingBet(provider, address);
        } catch (withdrawError) {
          console.warn("Error withdrawing winnings, but the bet is resolved", withdrawError);
        }
        
        // Get updated balances
        const { ftnBalance, lbrBalance } = await getBalances(address);
        
        // Determine the result (win if winnings are positive)
        const result: SpinResult = (withdrawalInfo.ftnAmount > 0 || withdrawalInfo.lbrAmount > 0) ? "win" : "loss";
        
        // Determine the result color (we can't know for sure)
        // Generate a random color, with a preference for the color that matches the result
        const resultColor: ResultColor = result === "win" ? (Math.random() > 0.3 ? "red" : "black") : (Math.random() > 0.7 ? "red" : "black");
        
        return {
          hasResolved: true,
          result,
          resultColor,
          ftnDelta: withdrawalInfo.ftnAmount,
          lbrDelta: withdrawalInfo.lbrAmount,
          ftnBalance,
          lbrBalance
        };
      }
    } catch (contractError) {
      console.error("Error interacting with contracts:", contractError);
    }
    
    // If we don't have a pending bet and no winnings to withdraw
    // or if an error occurred while interacting with the contracts
    return {
      hasResolved: false,
      ftnDelta: 0,
      lbrDelta: 0,
      ftnBalance: 0,
      lbrBalance: 0
    };
  } catch (error: any) {
    console.error("Error checking and claiming winnings:", error);
    // Ne pas propager l'erreur, retourner un résultat par défaut
    return {
      hasResolved: false,
      ftnDelta: 0,
      lbrDelta: 0,
      ftnBalance: 0,
      lbrBalance: 0
    };
  }
}

// Calculate wheel rotation based on result
export function calculateWheelRotation(resultColor: ResultColor): number {
  // The wheel has 32 slots (alternating red, black, and green)
  const totalSlices = 32;
  let sliceIndex = 0; // Initialisation par défaut

  // Déterminer l'index de la tranche basé sur la couleur du résultat
  if (resultColor === "red") {
    // Red segments are at even indices (0, 3, 6, ...)
    const redIndices = Array.from({ length: totalSlices / 3 }, (_, i) => i * 3);
    sliceIndex = redIndices[Math.floor(Math.random() * redIndices.length)];
  } else if (resultColor === "black") {
    // Black segments are at indices (1, 4, 7, ...)
    const blackIndices = Array.from({ length: totalSlices / 3 }, (_, i) => i * 3 + 1);
    sliceIndex = blackIndices[Math.floor(Math.random() * blackIndices.length)];
  } else if (resultColor === "green") {
    // Green segments (0) - quand la bille tombe sur le zéro, tous les paris sur rouge/noir perdent
    const greenIndices = Array.from({ length: totalSlices / 3 }, (_, i) => i * 3 + 2);
    sliceIndex = greenIndices[Math.floor(Math.random() * greenIndices.length)];
  }
  
  // Calculate rotation in degrees
  const degreesPerSlice = 360 / totalSlices;
  const extraSpins = 5; // Number of full rotations before stopping
  const rotation = extraSpins * 360 + sliceIndex * degreesPerSlice;
  
  return rotation;
}
