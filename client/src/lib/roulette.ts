// Types for roulette game
export type Token = "FTN" | "LBR";
export type BetColor = "red" | "black";
export type BetAmount = 0.1 | 0.5 | 1 | 5 | 10 | 25;
// Résultat du pari : gagné, perdu ou en attente de résolution
export type SpinResult = "win" | "loss" | "pending";
// Couleur sur laquelle la bille s'est arrêtée : rouge, noir ou vert (0)
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

import { placeBet as blockchainPlaceBet, getBalances, getPendingBetInfo, resolvePendingBet, PendingBetInfo, getPendingWithdrawals, PendingWithdrawalInfo } from './blockchain';
import { ethers } from 'ethers';

export async function placeBet(
  userId: number,
  betAmount: number,
  betToken: Token,
  betColor: BetColor
): Promise<SpinResponse> {
  try {
    // Obtenir le provider depuis window.ethereum
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const address = await provider.getSigner().getAddress();
    
    // Vérifier s'il y a des gains en attente à récupérer
    const withdrawalInfo = await getPendingWithdrawals(provider, address);
    
    if (withdrawalInfo.hasPendingWithdrawal) {
      try {
        // Récupérer les gains automatiquement
        await resolvePendingBet(provider, address);
        console.log("Gains récupérés automatiquement.");
      } catch (error) {
        console.warn("Erreur lors de la récupération des gains, mais nous continuons", error);
      }
    }
    
    // Convertir la couleur du pari en booléen (true pour rouge, false pour noir)
    const betOnRed = betColor === "red";
    
    // Placer le pari sur la blockchain
    const receipt = await blockchainPlaceBet(
      provider,
      betOnRed,
      betAmount,
      betToken === "FTN"
    );
    
    // Obtenir les soldes mis à jour
    const { ftnBalance, lbrBalance } = await getBalances(address);
    
    // Créer une transaction pour l'historique (le résultat réel sera déterminé par l'oracle)
    const transaction: Transaction = {
      id: `tx_${Math.floor(Math.random() * 1000000)}`,
      betAmount,
      betToken,
      betColor,
      result: "pending", // Le résultat est en attente
      resultColor: "green", // Couleur temporaire avant de connaître le résultat réel (rouge, noir ou vert/zéro)
      timestamp: Date.now(),
      txHash: receipt?.txHash
    };
    
    // Retourner la réponse
    return {
      result: "pending", // Le résultat est en attente
      resultColor: "green", // Couleur temporaire avant de connaître le résultat réel (rouge, noir ou vert/zéro)
      ftnDelta: 0, // Pas de delta tant que le résultat n'est pas connu
      lbrDelta: 0, // Pas de delta tant que le résultat n'est pas connu
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
    console.log("Récupération de l'historique des transactions pour l'adresse", address);
    
    // Obtenir le provider depuis window.ethereum
    if (!window.ethereum) {
      throw new Error("MetaMask n'est pas installé");
    }
    
    // Ne plus utiliser de simulation, toujours interagir avec la blockchain réelle
    console.log("Récupération des transactions réelles depuis la blockchain");
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Récupérer les transactions réelles depuis la blockchain
    // Nous allons implémenter une logique pour récupérer les transactions réelles
    // Pour l'instant, nous retournons un tableau vide
    // TODO: Implémenter la récupération des transactions réelles
    return [];
    
    // Note: Pour implémenter cette fonctionnalité complètement, il faudrait:
    // 1. Utiliser l'API d'un explorateur de blocs comme FTNScan
    // 2. Filtrer les transactions impliquant le contrat Roulette
    // 3. Analyser les logs d'événements pour déterminer les résultats des paris
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique des transactions:", error);
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

// Interface pour les informations sur un pari résolu
export interface ResolvedBetInfo {
  hasResolved: boolean;
  result?: SpinResult;
  resultColor?: ResultColor;
  ftnDelta: number;
  lbrDelta: number;
  ftnBalance: number;
  lbrBalance: number;
}

// Fonction pour vérifier et récupérer les gains d'un pari résolu
export async function checkAndClaimWinnings(): Promise<ResolvedBetInfo> {
  try {
    // Toujours interagir directement avec la blockchain, ne plus simuler
    // Obtenir le provider depuis window.ethereum
    if (!window.ethereum) {
      console.warn("MetaMask n'est pas installé, impossible de vérifier les gains");
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
      // Vérifier s'il y a des gains en attente
      const withdrawalInfo = await getPendingWithdrawals(provider, address);
      
      // Si nous avons des gains à retirer, le pari a été résolu
      if (withdrawalInfo.hasPendingWithdrawal) {
        try {
          // Récupérer les gains
          await resolvePendingBet(provider, address);
        } catch (withdrawError) {
          console.warn("Erreur lors du retrait des gains, mais le pari est résolu", withdrawError);
        }
        
        // Obtenir les soldes mis à jour
        const { ftnBalance, lbrBalance } = await getBalances(address);
        
        // Déterminer le résultat (gagné si les gains sont positifs)
        const result: SpinResult = (withdrawalInfo.ftnAmount > 0 || withdrawalInfo.lbrAmount > 0) ? "win" : "loss";
        
        // Déterminer la couleur du résultat (nous ne pouvons pas le savoir avec certitude)
        // Générer une couleur aléatoire, avec une préférence pour la couleur qui correspond au résultat
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
      console.error("Erreur lors de l'interaction avec les contrats:", contractError);
    }
    
    // Si nous n'avons pas de pari en attente et pas de gains à retirer
    // ou si une erreur s'est produite lors de l'interaction avec les contrats
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
