import { ethers } from 'ethers';
import { getLBRContract, getRouletteContract, parseAmount, formatAmount, BET_MULTIPLIER, ROULETTE_CONTRACT_ADDRESS, LBR_CONTRACT_ADDRESS } from './contracts';

// Configuration du réseau Bahamut
export const BAHAMUT_CHAIN_CONFIG = {
  chainId: 5165,
  chainName: "Bahamut Mainnet",
  nativeCurrency: {
    name: "Fantom",
    symbol: "FTN",
    decimals: 18
  },
  rpcUrls: ["https://rpc1.bahamut.io", "https://rpc2.bahamut.io"],
  blockExplorerUrls: ["https://ftnscan.com"]
};

// Fonction pour vérifier si le wallet est connecté au bon réseau
export async function checkNetwork(provider: ethers.providers.Web3Provider): Promise<boolean> {
  try {
    // Vérifier le réseau
    const network = await provider.getNetwork();
    const isCorrect = network.chainId === BAHAMUT_CHAIN_CONFIG.chainId;
    
    if (!isCorrect) {
      console.warn(`Réseau incorrect: ${network.name} (${network.chainId}) au lieu de Bahamut (${BAHAMUT_CHAIN_CONFIG.chainId})`);
    } else {
      console.log(`Connecté au réseau Bahamut (${BAHAMUT_CHAIN_CONFIG.chainId})`);
    }
    
    return isCorrect;
  } catch (error) {
    console.error("Erreur lors de la vérification du réseau:", error);
    return false;
  }
}

// Fonction pour demander à l'utilisateur de changer de réseau
export async function switchToBahamutNetwork(): Promise<boolean> {
  if (!window.ethereum) {
    console.error("MetaMask is not installed");
    return false;
  }

  try {
    // Essayer de changer de réseau
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${BAHAMUT_CHAIN_CONFIG.chainId.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    // Si le réseau n'existe pas, essayer de l'ajouter
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${BAHAMUT_CHAIN_CONFIG.chainId.toString(16)}`,
              chainName: BAHAMUT_CHAIN_CONFIG.chainName,
              nativeCurrency: BAHAMUT_CHAIN_CONFIG.nativeCurrency,
              rpcUrls: BAHAMUT_CHAIN_CONFIG.rpcUrls,
              blockExplorerUrls: BAHAMUT_CHAIN_CONFIG.blockExplorerUrls
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding Bahamut network:", addError);
        return false;
      }
    }
    console.error("Error switching to Bahamut network:", switchError);
    return false;
  }
}

// Fonction pour obtenir le provider et le signer
export async function getProviderAndSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  // Créer d'abord le provider
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  
  // Vérifier et changer de réseau si nécessaire
  const isCorrectNetwork = await checkNetwork(provider);
  if (!isCorrectNetwork) {
    const switched = await switchToBahamutNetwork();
    if (!switched) {
      throw new Error("Please switch to Bahamut network");
    }
  }

  const signer = provider.getSigner();
  return { provider, signer };
}

// Fonction pour obtenir les soldes FTN et LBR
export async function getBalances(address: string): Promise<{ ftnBalance: number, lbrBalance: number }> {
  try {
    const { provider, signer } = await getProviderAndSigner();
    
    // Obtenir le solde FTN
    const ftnBalanceWei = await provider.getBalance(address);
    const ftnBalance = parseFloat(ethers.utils.formatEther(ftnBalanceWei));
    
    // Obtenir le solde LBR
    const lbrContract = getLBRContract(provider);
    const lbrBalanceWei = await lbrContract.balanceOf(address);
    const lbrBalance = parseFloat(ethers.utils.formatEther(lbrBalanceWei));
    
    return { ftnBalance, lbrBalance };
  } catch (error) {
    console.error("Error getting balances:", error);
    return {
      ftnBalance: 0,
      lbrBalance: 0
    };
  }
}

// Fonction pour placer un pari
export async function placeBet(provider: ethers.providers.Web3Provider | ethers.Signer, betOnRed: boolean, amount: number, isFTNBet: boolean) {
  try {
    console.log(`Placement d'un pari sur ${betOnRed ? 'rouge' : 'noir'} avec ${amount} ${isFTNBet ? 'FTN' : 'LBR'}`);
    
    // Obtenir le signer
    let signer: ethers.Signer;
    if ('getSigner' in provider) {
      signer = provider.getSigner();
    } else {
      signer = provider;
    }
    
    // Obtenir le contrat
    const rouletteContract = getRouletteContract(signer);
    
    // Préparer le montant avec le multiplicateur (0.0001)
    const realAmount = parseAmount(amount * BET_MULTIPLIER);
    console.log(`Montant réel parié: ${ethers.utils.formatEther(realAmount)} ${isFTNBet ? 'FTN' : 'LBR'} (multiplicateur: ${BET_MULTIPLIER})`);
    
    // Placer le pari
    let tx;
    if (isFTNBet) {
      // Pari en FTN
      console.log(`Placement d'un pari en FTN de ${ethers.utils.formatEther(realAmount)} FTN sur ${betOnRed ? 'rouge' : 'noir'}`);
      tx = await rouletteContract.bet(betOnRed, realAmount, { value: realAmount });
    } else {
      // Pari en LBR
      console.log(`Placement d'un pari en LBR de ${ethers.utils.formatEther(realAmount)} LBR sur ${betOnRed ? 'rouge' : 'noir'}`);
      
      // Approuver d'abord le contrat pour dépenser les tokens LBR
      const lbrContract = getLBRContract(signer);
      console.log(`Approbation du contrat Roulette pour dépenser ${ethers.utils.formatEther(realAmount)} LBR`);
      
      try {
        const approveTx = await lbrContract.approve(ROULETTE_CONTRACT_ADDRESS, realAmount);
        console.log(`Transaction d'approbation envoyée: ${approveTx.hash}`);
        
        // Attendre la confirmation de l'approbation
        const approveReceipt = await approveTx.wait();
        console.log(`Approbation confirmée dans le bloc ${approveReceipt.blockNumber}`);
      } catch (approveError) {
        console.error("Erreur lors de l'approbation des tokens LBR:", approveError);
        return { success: false, error: "Erreur lors de l'approbation des tokens LBR" };
      }
      
      // Placer le pari en LBR
      tx = await rouletteContract.bet(betOnRed, realAmount, { value: 0 });
    }
    
    console.log(`Transaction de pari envoyée: ${tx.hash}`);
    
    // Attendre la confirmation de la transaction
    const receipt = await tx.wait();
    console.log(`Pari confirmé dans le bloc ${receipt.blockNumber}`);
    
    return { 
      success: true, 
      txHash: tx.hash,
      betAmount: amount,
      betOnRed: betOnRed,
      isFTNBet: isFTNBet
    };
  } catch (error) {
    console.error("Erreur lors du placement du pari:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur inconnue lors du placement du pari" 
    };
  }
}

// Fonction pour retirer les gains
export async function withdraw(provider: any, address?: string) {
  try {
    console.log("Tentative de retrait des gains...");
    
    // Obtenir le signer
    const signer = provider.getSigner();
    const rouletteContract = getRouletteContract(signer);
    
    // Utiliser withdrawFunds au lieu de withdraw pour correspondre au contrat réel
    const tx = await rouletteContract.withdrawFunds();
    await tx.wait();
    
    console.log("Gains retirés avec succès!");
    return true;
  } catch (error) {
    console.error("Erreur lors du retrait des gains:", error);
    return false;
  }
}

// Interface pour le résultat d'un pari
export interface BetResult {
  hasWon: boolean;
  winAmount: string;
  betOnRed: boolean;
  resultNumber: number;
  resultColor: string; // "red", "black", or "green"
}

// Interface pour les informations sur un pari en attente
export interface PendingBetInfo {
  isPending: boolean;
  isInconsistentState: boolean;
  pendingFTN: number;
  pendingLBR: number;
  betOnRed?: boolean;
}

// Interface pour les informations sur les retraits en attente
export interface PendingWithdrawalInfo {
  hasPendingWithdrawal: boolean;
  ftnAmount: number;
  lbrAmount: number;
}

// Fonction pour écouter les événements du contrat et obtenir les résultats des paris
export function listenForBetResults(
  provider: ethers.providers.Web3Provider,
  address: string,
  callback: (result: BetResult) => void
) {
  const rouletteContract = getRouletteContract(provider);
  
  // Écouter l'événement ResultGenerated
  rouletteContract.on("ResultGenerated", 
    (player, won, result, isFTNBet, betAmount, payoutFTN, payoutLBR) => {
      // Vérifier si c'est pour notre adresse
      if (player.toLowerCase() === address.toLowerCase()) {
        const betResult: BetResult = {
          hasWon: won,
          winAmount: won ? 
            (isFTNBet ? formatAmount(payoutFTN).toString() : formatAmount(payoutLBR).toString()) : 
            "0",
          betOnRed: result === 0, // 0 = rouge
          resultNumber: result,
          resultColor: result === 0 ? "red" : result === 1 ? "black" : "green"
        };
        
        console.log("Résultat du pari reçu de la blockchain:", betResult);
        
        // Appeler le callback avec le résultat
        callback(betResult);
      }
    }
  );
  
  // Retourner une fonction pour arrêter d'écouter
  return () => {
    rouletteContract.removeAllListeners("ResultGenerated");
    console.log("Arrêt de l'écoute des événements de pari");
  };
}

// Fonction pour vérifier s'il y a un pari en attente
export async function getPendingBetInfo(provider: ethers.providers.Web3Provider | ethers.Signer, address: string): Promise<PendingBetInfo> {
  try {
    // Obtenir le contrat
    const rouletteContract = getRouletteContract(provider);
    
    // Vérifier directement avec le contrat s'il y a un pari en attente
    const isPending = await rouletteContract.waitingForResult(address.toLowerCase());
    
    // Valeurs par défaut simplifiées
    return {
      isPending,
      isInconsistentState: false,
      pendingFTN: 0,
      pendingLBR: 0
    };
  } catch (error) {
    console.error("Erreur lors de la vérification du pari en attente:", error);
    
    // En cas d'erreur, supposer qu'il n'y a pas de pari en attente
    return {
      isPending: false,
      isInconsistentState: false,
      pendingFTN: 0,
      pendingLBR: 0
    };
  }
}

// Fonction pour vérifier s'il y a des retraits en attente
export async function getPendingWithdrawals(provider: ethers.providers.Web3Provider | ethers.Signer, address: string): Promise<PendingWithdrawalInfo> {
  try {
    // Obtenir le contrat
    const rouletteContract = getRouletteContract(provider);
    
    // Vérifier les gains en attente
    const pendingFTN = await rouletteContract.pendingWithdrawalsFTN(address.toLowerCase());
    const pendingLBR = await rouletteContract.pendingWithdrawalsLBR(address.toLowerCase());
    
    // Convertir en nombre pour faciliter l'affichage
    const ftnAmount = parseFloat(ethers.utils.formatEther(pendingFTN));
    const lbrAmount = parseFloat(ethers.utils.formatEther(pendingLBR));
    
    // Vérifier s'il y a des gains en attente
    const hasPendingWithdrawal = ftnAmount > 0 || lbrAmount > 0;
    
    return {
      hasPendingWithdrawal,
      ftnAmount,
      lbrAmount
    };
  } catch (error) {
    console.error("Erreur lors de la vérification des retraits en attente:", error);
    
    // En cas d'erreur, supposer qu'il n'y a pas de retraits en attente
    return {
      hasPendingWithdrawal: false,
      ftnAmount: 0,
      lbrAmount: 0
    };
  }
}

// Fonction pour résoudre un pari en attente (retirer les gains)
export async function resolvePendingBet(provider: ethers.providers.Web3Provider | ethers.Signer, address?: string) {
  try {
    console.log("Tentative de résolution d'un pari en attente...");
    
    // Utiliser la fonction withdraw pour récupérer les gains
    const success = await withdraw(provider, address);
    
    if (success) {
      console.log("Pari résolu avec succès, gains retirés!");
    } else {
      console.warn("Échec de la résolution du pari");
    }
    
    return success;
  } catch (error) {
    console.error("Erreur lors de la résolution du pari en attente:", error);
    throw error;
  }
}

// Fonction vide pour la compatibilité avec le code existant
// Cette fonction ne fait rien car nous ne gérons plus les paris bloqués
export async function forceResetPendingBet(provider: ethers.providers.Web3Provider | ethers.Signer, address: string): Promise<boolean> {
  console.log("La fonction forceResetPendingBet est désactivée - nous ne gérons plus les paris bloqués");
  // Retourner true pour éviter des erreurs dans l'interface utilisateur
  return true;
}
