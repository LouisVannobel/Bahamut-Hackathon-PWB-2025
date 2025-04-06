import { ethers } from 'ethers';
import { BET_MULTIPLIER } from './contracts';

// Types
export interface BetResult {
  hasWon: boolean;
  winAmount: string;
  betOnRed: boolean;
  resultNumber: number;
  resultColor: string; // "red", "black", or "green"
}

export interface PendingBetInfo {
  isPending: boolean;
  isInconsistentState: boolean;
  pendingFTN: number;
  pendingLBR: number;
  betOnRed?: boolean;
}

export interface PendingWithdrawalInfo {
  hasPendingWithdrawal: boolean;
  ftnAmount: number;
  lbrAmount: number;
}

export interface TransactionHistory {
  id: string;
  timestamp: number;
  type: 'bet' | 'win' | 'loss' | 'withdraw';
  amount: number;
  token: 'FTN' | 'LBR';
  color?: 'red' | 'black';
  resultColor?: 'red' | 'black';
  txHash: string;
}

// Define types for our mock storage
interface BalanceInfo {
  ftn: number;
  lbr: number;
}

interface PendingBet {
  amount: number;
  token: string;
  betOnRed: boolean;
  timestamp: number;
}

interface MockStorage {
  balances: Record<string, BalanceInfo>;
  pendingBets: Record<string, PendingBet | null>;
  pendingWithdrawals: Record<string, BalanceInfo>;
  transactionHistory: Record<string, TransactionHistory[]>;
  initializeForAddress: (address: string) => void;
}

// Mock storage
const mockStorage: MockStorage = {
  balances: {
    'default': { ftn: 2, lbr: 1.1 } // Balances initiales
  },
  pendingBets: {}, // address -> { amount: number, token: string, betOnRed: boolean, timestamp: number }
  pendingWithdrawals: {}, // address -> { ftn: number, lbr: number }
  transactionHistory: {}, // address -> TransactionHistory[]
  
  // Initialize storage for an address
  initializeForAddress(address: string) {
    if (!this.balances[address]) {
      this.balances[address] = { ftn: 2, lbr: 1.1 }; // Initialiser avec les nouvelles valeurs
    }
    if (!this.pendingBets[address]) {
      this.pendingBets[address] = null;
    }
    if (!this.pendingWithdrawals[address]) {
      this.pendingWithdrawals[address] = { ftn: 0, lbr: 0 };
    }
    if (!this.transactionHistory[address]) {
      this.transactionHistory[address] = [];
    }
  }
};

// Helper functions
function generateTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to trigger a real MetaMask transaction
export async function triggerMetaMaskTransaction(provider: any, params: any): Promise<string> {
  try {
    // This will trigger the real MetaMask popup
    const txHash = await provider.send('eth_sendTransaction', [params]);
    return txHash;
  } catch (error) {
    console.error('MetaMask transaction error:', error);
    throw error;
  }
}

// Blockchain simulation functions
export async function getBalances(address: string): Promise<{ ftnBalance: number, lbrBalance: number }> {
  mockStorage.initializeForAddress(address);
  return {
    ftnBalance: mockStorage.balances[address].ftn,
    lbrBalance: mockStorage.balances[address].lbr
  };
}

export async function placeBet(provider: any, betOnRed: boolean, amount: number, isFTNBet: boolean) {
  // Get the signer's address
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  
  mockStorage.initializeForAddress(address);
  
  // Check if there's already a pending bet
  if (mockStorage.pendingBets[address]) {
    throw new Error("You already have a pending bet");
  }
  
  // Check if the user has enough balance
  const token = isFTNBet ? 'FTN' : 'LBR';
  if (mockStorage.balances[address][token.toLowerCase()] < amount) {
    throw new Error(`Insufficient ${token} balance`);
  }
  
  // Prepare transaction parameters for MetaMask
  const contractAddress = isFTNBet ? 
    '0x59f412D9643b536A65142166303051A6Ba8B0BF3' : // Roulette contract
    '0x2302c75D734d53Cf511527F517716735A7A71441'; // LBR contract
  
  // Calculate the actual amount to bet (with multiplier)
  const actualAmount = amount * 0.0001; // Apply the multiplier
  const amountInWei = ethers.utils.parseEther(actualAmount.toString());
  
  // Create transaction parameters
  const txParams = {
    from: address,
    to: contractAddress,
    value: amountInWei.toHexString(),
    data: '0x' + (
      betOnRed ? 
        '7a8d5214' : // Function signature for betting on red
        '9a2bfa0f'   // Function signature for betting on black
    ),
    chainId: '0x1425' // 5165 in hex (Bahamut Mainnet)
  };
  
  try {
    // This will trigger the real MetaMask popup
    const txHash = await triggerMetaMaskTransaction(provider, txParams);
    
    // Deduct the bet amount from the balance
    const balanceKey = token === 'FTN' ? 'ftn' : 'lbr';
    mockStorage.balances[address][balanceKey] -= amount;
    
    // Create a pending bet
    mockStorage.pendingBets[address] = {
      amount,
      token,
      betOnRed,
      timestamp: Date.now()
    };
    
    // Add to transaction history
    mockStorage.transactionHistory[address].push({
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      type: 'bet',
      amount,
      token: token as 'FTN' | 'LBR',
      color: betOnRed ? 'red' : 'black',
      txHash
    });
    
    // Return a transaction receipt
    return {
      success: true,
      txHash,
      message: `Bet placed on ${betOnRed ? 'red' : 'black'} with ${amount} ${token}`
    };
  } catch (error: any) {
    // If user rejected the transaction
    if (error.code === 4001) {
      throw new Error("Transaction rejected by user");
    }
    throw error;
  }
}

export async function getPendingBetInfo(provider: any, address: string): Promise<PendingBetInfo> {
  mockStorage.initializeForAddress(address);
  
  const pendingBet = mockStorage.pendingBets[address];
  
  return {
    isPending: !!pendingBet,
    isInconsistentState: false,
    pendingFTN: pendingBet && pendingBet.token === 'FTN' ? pendingBet.amount : 0,
    pendingLBR: pendingBet && pendingBet.token === 'LBR' ? pendingBet.amount : 0,
    betOnRed: pendingBet ? pendingBet.betOnRed : undefined
  };
}

export async function getPendingWithdrawals(provider: any, address: string): Promise<PendingWithdrawalInfo> {
  mockStorage.initializeForAddress(address);
  
  const withdrawals = mockStorage.pendingWithdrawals[address];
  
  return {
    hasPendingWithdrawal: withdrawals.ftn > 0 || withdrawals.lbr > 0,
    ftnAmount: withdrawals.ftn,
    lbrAmount: withdrawals.lbr
  };
}

export async function withdraw(provider: any, address?: string) {
  let userAddress: string;
  if (!address) {
    const signer = provider.getSigner();
    userAddress = await signer.getAddress();
  } else {
    userAddress = address;
  }
  
  mockStorage.initializeForAddress(userAddress);
  
  const withdrawals = mockStorage.pendingWithdrawals[userAddress];
  
  // Check if there's anything to withdraw
  if (withdrawals.ftn <= 0 && withdrawals.lbr <= 0) {
    return true; // Nothing to withdraw
  }
  
  // Prepare transaction parameters for MetaMask
  const contractAddress = '0x59f412D9643b536A65142166303051A6Ba8B0BF3'; // Roulette contract
  
  // Create transaction parameters
  const txParams = {
    from: userAddress,
    to: contractAddress,
    value: '0x0', // No ETH being sent
    data: '0x3ccfd60b', // Function signature for withdraw()
    chainId: '0x1425' // 5165 in hex (Bahamut Mainnet)
  };
  
  try {
    // This will trigger the real MetaMask popup
    const txHash = await triggerMetaMaskTransaction(provider, txParams);
    
    if (withdrawals.ftn > 0) {
      mockStorage.balances[userAddress].ftn += withdrawals.ftn;
      
      // Add to transaction history
      mockStorage.transactionHistory[userAddress].push({
        id: Math.random().toString(36).substring(2, 15),
        timestamp: Date.now(),
        type: 'withdraw',
        amount: withdrawals.ftn,
        token: 'FTN',
        txHash
      });
      
      withdrawals.ftn = 0;
    }
    
    if (withdrawals.lbr > 0) {
      mockStorage.balances[userAddress].lbr += withdrawals.lbr;
      
      // Add to transaction history
      mockStorage.transactionHistory[userAddress].push({
        id: Math.random().toString(36).substring(2, 15),
        timestamp: Date.now(),
        type: 'withdraw',
        amount: withdrawals.lbr,
        token: 'LBR',
        txHash
      });
      
      withdrawals.lbr = 0;
    }
    
    return true;
  } catch (error: any) {
    // If user rejected the transaction
    if (error.code === 4001) {
      throw new Error("Transaction rejected by user");
    }
    throw error;
  }
}

export function listenForBetResults(
  provider: any,
  address: string,
  callback: (result: BetResult) => void
) {
  // This function would normally set up event listeners
  // In our mock, we'll just return a cleanup function
  
  return () => {
    console.log("Stopped listening for bet events");
  };
}

export async function resolvePendingBet(provider: any, address?: string) {
  let userAddress: string;
  if (!address) {
    const signer = provider.getSigner();
    userAddress = await signer.getAddress();
  } else {
    userAddress = address;
  }
  
  mockStorage.initializeForAddress(userAddress);
  
  const pendingBet = mockStorage.pendingBets[userAddress];
  if (!pendingBet) {
    return false;
  }
  
  // Simulate bet resolution with random result
  const hasWon = Math.random() > 0.5; // 50% chance of winning
  const resultNumber = hasWon ? (pendingBet.betOnRed ? 0 : 1) : (pendingBet.betOnRed ? 1 : 0);
  const resultColor = resultNumber === 0 ? "red" : "black";
  
  // Calculate winnings
  if (hasWon) {
    const winAmount = pendingBet.amount * 2; // Double the bet amount
    
    if (pendingBet.token === 'FTN') {
      mockStorage.pendingWithdrawals[userAddress].ftn += winAmount;
    } else {
      mockStorage.pendingWithdrawals[userAddress].lbr += winAmount;
    }
    
    // Add to transaction history
    mockStorage.transactionHistory[userAddress].push({
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      type: 'win',
      amount: winAmount,
      token: pendingBet.token as 'FTN' | 'LBR',
      color: pendingBet.betOnRed ? 'red' : 'black',
      resultColor: resultColor as 'red' | 'black',
      txHash: generateTxHash()
    });
  } else {
    // Add loss to transaction history
    mockStorage.transactionHistory[userAddress].push({
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      type: 'loss',
      amount: pendingBet.amount,
      token: pendingBet.token as 'FTN' | 'LBR',
      color: pendingBet.betOnRed ? 'red' : 'black',
      resultColor: resultColor as 'red' | 'black',
      txHash: generateTxHash()
    });
  }
  
  // Clear the pending bet
  mockStorage.pendingBets[userAddress] = null;
  
  return true;
}

export async function forceResetPendingBet(provider: any, address: string): Promise<boolean> {
  mockStorage.initializeForAddress(address);
  mockStorage.pendingBets[address] = null;
  return true;
}

export async function checkAndClaimWinnings() {
  // This is a helper function that would normally check for winnings and claim them
  // In our mock, we'll just return a dummy result
  
  return {
    hasResolved: true,
    result: Math.random() > 0.5 ? "win" : "loss",
    ftnDelta: Math.random() > 0.5 ? getRandomInt(10, 100) : 0,
    lbrDelta: Math.random() > 0.5 ? getRandomInt(5, 50) : 0,
    resultColor: Math.random() > 0.5 ? "red" : "black"
  };
}

export function getTransactionHistory(address: string): TransactionHistory[] {
  mockStorage.initializeForAddress(address);
  return mockStorage.transactionHistory[address];
}

// Mock blockchain network functions
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

export async function checkNetwork(provider: any): Promise<boolean> {
  return true; // Always return true in mock
}

export async function switchToBahamutNetwork(): Promise<boolean> {
  return true; // Always return true in mock
}

export async function getProviderAndSigner() {
  // Create a mock provider and signer
  const mockProvider = {
    getNetwork: async () => ({ chainId: BAHAMUT_CHAIN_CONFIG.chainId, name: BAHAMUT_CHAIN_CONFIG.chainName }),
    getBalance: async (address: string) => ethers.utils.parseEther("1000"),
    getSigner: () => mockSigner
  };
  
  const mockSigner = {
    getAddress: async () => "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    provider: mockProvider
  };
  
  return { provider: mockProvider, signer: mockSigner };
}
