import { ethers } from 'ethers';
import { getLBRContract, getRouletteContract, parseAmount, formatAmount, BET_MULTIPLIER, ROULETTE_CONTRACT_ADDRESS, LBR_CONTRACT_ADDRESS } from './contracts';

// Bahamut network configuration
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

// Function to check if the wallet is connected to the correct network
export async function checkNetwork(provider: ethers.providers.Web3Provider): Promise<boolean> {
  try {
    // Check the network
    const network = await provider.getNetwork();
    const isCorrect = network.chainId === BAHAMUT_CHAIN_CONFIG.chainId;
    
    if (!isCorrect) {
      console.warn(`Incorrect network: ${network.name} (${network.chainId}) instead of Bahamut (${BAHAMUT_CHAIN_CONFIG.chainId})`);
    } else {
      console.log(`Connected to Bahamut network (${BAHAMUT_CHAIN_CONFIG.chainId})`);
    }
    
    return isCorrect;
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
}

// Function to ask the user to switch networks
export async function switchToBahamutNetwork(): Promise<boolean> {
  if (!window.ethereum) {
    console.error("MetaMask is not installed");
    return false;
  }

  try {
    // Try to switch networks
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${BAHAMUT_CHAIN_CONFIG.chainId.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    // If the network doesn't exist, try to add it
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

// Function to get the provider and signer
export async function getProviderAndSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  // First create the provider
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  
  // Check and change network if necessary
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

// Function to get FTN and LBR balances
export async function getBalances(address: string): Promise<{ ftnBalance: number, lbrBalance: number }> {
  try {
    const { provider, signer } = await getProviderAndSigner();
    
    // Get FTN balance
    const ftnBalanceWei = await provider.getBalance(address);
    const ftnBalance = parseFloat(ethers.utils.formatEther(ftnBalanceWei));
    
    // Get LBR balance
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

// Function to place a bet
export async function placeBet(provider: ethers.providers.Web3Provider | ethers.Signer, betOnRed: boolean, amount: number, isFTNBet: boolean) {
  try {
    console.log(`Placing a bet on ${betOnRed ? 'red' : 'black'} with ${amount} ${isFTNBet ? 'FTN' : 'LBR'}`);
    
    // Get the signer
    let signer: ethers.Signer;
    if ('getSigner' in provider) {
      signer = provider.getSigner();
    } else {
      signer = provider;
    }
    
    // Get the contract
    const rouletteContract = getRouletteContract(signer);
    
    // Prepare the amount with the multiplier (0.0001)
    const realAmount = parseAmount(amount * BET_MULTIPLIER);
    console.log(`Actual bet amount: ${ethers.utils.formatEther(realAmount)} ${isFTNBet ? 'FTN' : 'LBR'} (multiplier: ${BET_MULTIPLIER})`);
    
    // Placer le pari
    let tx;
    if (isFTNBet) {
      // FTN bet
      console.log(`Placing an FTN bet of ${ethers.utils.formatEther(realAmount)} FTN on ${betOnRed ? 'red' : 'black'}`);
      tx = await rouletteContract.bet(betOnRed, realAmount, { value: realAmount });
    } else {
      // LBR bet
      console.log(`Placing an LBR bet of ${ethers.utils.formatEther(realAmount)} LBR on ${betOnRed ? 'red' : 'black'}`);
      
      // First approve the contract to spend LBR tokens
      const lbrContract = getLBRContract(signer);
      console.log(`Approving the Roulette contract to spend ${ethers.utils.formatEther(realAmount)} LBR`);
      
      try {
        const approveTx = await lbrContract.approve(ROULETTE_CONTRACT_ADDRESS, realAmount);
        console.log(`Approval transaction sent: ${approveTx.hash}`);
        
        // Wait for approval confirmation
        const approveReceipt = await approveTx.wait();
        console.log(`Approval confirmed in block ${approveReceipt.blockNumber}`);
      } catch (approveError) {
        console.error("Error approving LBR tokens:", approveError);
        return { success: false, error: "Error approving LBR tokens" };
      }
      
      // Place the LBR bet
      tx = await rouletteContract.bet(betOnRed, realAmount, { value: 0 });
    }
    
    console.log(`Bet transaction sent: ${tx.hash}`);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log(`Bet confirmed in block ${receipt.blockNumber}`);
    
    return { 
      success: true, 
      txHash: tx.hash,
      betAmount: amount,
      betOnRed: betOnRed,
      isFTNBet: isFTNBet
    };
  } catch (error) {
    console.error("Error placing bet:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error while placing bet" 
    };
  }
}

// Function to withdraw winnings
export async function withdraw(provider: any, address?: string) {
  try {
    console.log("Attempting to withdraw winnings...");
    
    // Get the signer
    const signer = provider.getSigner();
    const rouletteContract = getRouletteContract(signer);
    
    // Use withdrawFunds instead of withdraw to match the actual contract
    const tx = await rouletteContract.withdrawFunds();
    await tx.wait();
    
    console.log("Winnings successfully withdrawn!");
    return true;
  } catch (error) {
    console.error("Error withdrawing winnings:", error);
    return false;
  }
}

// Interface for bet result
export interface BetResult {
  hasWon: boolean;
  winAmount: string;
  betOnRed: boolean;
  resultNumber: number;
  resultColor: string; // "red", "black", or "green"
}

// Interface for pending bet information
export interface PendingBetInfo {
  isPending: boolean;
  isInconsistentState: boolean;
  pendingFTN: number;
  pendingLBR: number;
  betOnRed?: boolean;
}

// Interface for pending withdrawal information
export interface PendingWithdrawalInfo {
  hasPendingWithdrawal: boolean;
  ftnAmount: number;
  lbrAmount: number;
}

// Function to listen for contract events and get bet results
export function listenForBetResults(
  provider: ethers.providers.Web3Provider,
  address: string,
  callback: (result: BetResult) => void
) {
  const rouletteContract = getRouletteContract(provider);
  
  // Listen for the ResultGenerated event
  rouletteContract.on("ResultGenerated", 
    (player, won, result, isFTNBet, betAmount, payoutFTN, payoutLBR) => {
      // Check if it's for our address
      if (player.toLowerCase() === address.toLowerCase()) {
        const betResult: BetResult = {
          hasWon: won,
          winAmount: won ? 
            (isFTNBet ? formatAmount(payoutFTN).toString() : formatAmount(payoutLBR).toString()) : 
            "0",
          betOnRed: result === 0, // 0 = red
          resultNumber: result,
          resultColor: result === 0 ? "red" : result === 1 ? "black" : "green"
        };
        
        console.log("Bet result received from blockchain:", betResult);
        
        // Call the callback with the result
        callback(betResult);
      }
    }
  );
  
  // Return a function to stop listening
  return () => {
    rouletteContract.removeAllListeners("ResultGenerated");
    console.log("Stopped listening for bet events");
  };
}

// Function to check if there is a pending bet
export async function getPendingBetInfo(provider: ethers.providers.Web3Provider | ethers.Signer, address: string): Promise<PendingBetInfo> {
  try {
    // Get the contract
    const rouletteContract = getRouletteContract(provider);
    
    // Check directly with the contract if there is a pending bet
    const isPending = await rouletteContract.waitingForResult(address.toLowerCase());
    
    // Simplified default values
    return {
      isPending,
      isInconsistentState: false,
      pendingFTN: 0,
      pendingLBR: 0
    };
  } catch (error) {
    console.error("Error checking pending bet:", error);
    
    // In case of error, assume there is no pending bet
    return {
      isPending: false,
      isInconsistentState: false,
      pendingFTN: 0,
      pendingLBR: 0
    };
  }
}

// Function to check if there are pending withdrawals
export async function getPendingWithdrawals(provider: ethers.providers.Web3Provider | ethers.Signer, address: string): Promise<PendingWithdrawalInfo> {
  try {
    // Get the contract
    const rouletteContract = getRouletteContract(provider);
    
    // Check pending winnings
    const pendingFTN = await rouletteContract.pendingWithdrawalsFTN(address.toLowerCase());
    const pendingLBR = await rouletteContract.pendingWithdrawalsLBR(address.toLowerCase());
    
    // Convert to number for easier display
    const ftnAmount = parseFloat(ethers.utils.formatEther(pendingFTN));
    const lbrAmount = parseFloat(ethers.utils.formatEther(pendingLBR));
    
    // Check if there are pending winnings
    const hasPendingWithdrawal = ftnAmount > 0 || lbrAmount > 0;
    
    return {
      hasPendingWithdrawal,
      ftnAmount,
      lbrAmount
    };
  } catch (error) {
    console.error("Error checking pending withdrawals:", error);
    
    // In case of error, assume there are no pending withdrawals
    return {
      hasPendingWithdrawal: false,
      ftnAmount: 0,
      lbrAmount: 0
    };
  }
}

// Function to resolve a pending bet (withdraw winnings)
export async function resolvePendingBet(provider: ethers.providers.Web3Provider | ethers.Signer, address?: string) {
  try {
    console.log("Attempting to resolve a pending bet...");
    
    // Use the withdraw function to retrieve winnings
    const success = await withdraw(provider, address);
    
    if (success) {
      console.log("Bet successfully resolved, winnings withdrawn!");
    } else {
      console.warn("Failed to resolve bet");
    }
    
    return success;
  } catch (error) {
    console.error("Error resolving pending bet:", error);
    throw error;
  }
}

// Empty function for compatibility with existing code
// This function does nothing because we no longer manage blocked bets
export async function forceResetPendingBet(provider: ethers.providers.Web3Provider | ethers.Signer, address: string): Promise<boolean> {
  console.log("The forceResetPendingBet function is disabled - we no longer manage blocked bets");
  // Return true to avoid errors in the user interface
  return true;
}
