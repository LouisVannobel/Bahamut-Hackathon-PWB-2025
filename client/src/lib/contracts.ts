import { ethers } from 'ethers';

// Multiplier pour les montants de paris (0.0001 signifie que 100 FTN dans l'interface = 0.01 FTN réel)
// Valeur réduite pour préserver la liquidité des contrats
export const BET_MULTIPLIER = 0.0001;

// ABI pour le contrat LBR (LooserBracket)
export const LBR_ABI = [
  // Fonctions de base ERC20
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  // Métadonnées
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

// ABI pour le contrat de Roulette (basé sur l'ABI réel du contrat déployé)
export const ROULETTE_ABI = [
  // Fonctions pour placer des paris
  "function bet(bool _betOnRed, uint256 _amount) payable",
  
  // Fonctions pour retirer des gains
  "function withdrawFunds()",
  
  // Mappings publics pour vérifier les paris et les gains en attente
  "function pendingWithdrawalsFTN(address) view returns (uint256)",
  "function pendingWithdrawalsLBR(address) view returns (uint256)",
  "function waitingForResult(address) view returns (bool)",
  
  // Événements
  "event BetPlaced(address indexed player, bool betOnRed, bool isFTNBet, uint256 requestId, uint256 betValue)",
  "event ResultGenerated(address indexed player, bool won, uint8 result, bool isFTNBet, uint256 betAmount, uint256 payoutFTN, uint256 payoutLBR)",
  "event FundsWithdrawn(address indexed player, uint256 ftnAmount, uint256 lbrAmount)"
];

// Adresses des contrats sur Bahamut Mainnet (Chain ID: 5165)
// Adresses réelles des contrats déployés
export const LBR_CONTRACT_ADDRESS = "0x2302c75D734d53Cf511527F517716735A7A71441"; // Adresse du contrat BLR
export const ROULETTE_CONTRACT_ADDRESS = "0x4802D3e13965b1553f1085E794aCB2F11308972e"; // Adresse du contrat Roulette (mise à jour le 06/04/2025)

// Fonction pour obtenir une instance du contrat LBR
export function getLBRContract(provider: ethers.providers.Provider | ethers.Signer) {
  return new ethers.Contract(LBR_CONTRACT_ADDRESS, LBR_ABI, provider);
}

// Fonction pour obtenir une instance du contrat Roulette
export function getRouletteContract(provider: ethers.providers.Provider | ethers.Signer) {
  return new ethers.Contract(ROULETTE_CONTRACT_ADDRESS, ROULETTE_ABI, provider);
}

// Fonction pour convertir un montant en wei
export const parseAmount = (amount: number) => {
  const adjustedAmount = amount * BET_MULTIPLIER;
  return ethers.utils.parseEther(adjustedAmount.toFixed(18));
};

// Fonction pour formater un montant de wei en ethers
export const formatAmount = (amount: ethers.BigNumber) => {
  return parseFloat(ethers.utils.formatEther(amount)) / BET_MULTIPLIER;
};
