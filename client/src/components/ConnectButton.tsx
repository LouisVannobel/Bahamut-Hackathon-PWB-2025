import React, { useEffect } from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton } from "thirdweb/react";
import {
  inAppWallet,
  createWallet,
} from "thirdweb/wallets";
import { useWallet } from "@/context/WalletContext";

// Créer le client ThirdWeb avec l'ID client
const client = createThirdwebClient({
  clientId: "782bdd46285be2807914b8bc6c9684af",
});

// Configuration des wallets supportés
const wallets = [
  inAppWallet({
    auth: {
      options: ["email", "coinbase", "github", "google"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

// Composant de bouton de connexion ThirdWeb
export default function ThirdwebConnectButton() {
  // Utiliser notre contexte pour obtenir l'état de connexion
  const { isConnected, walletAddress } = useWallet();

  // Afficher l'état de connexion dans la console pour le débogage
  useEffect(() => {
    console.log("État de connexion:", { isConnected, walletAddress });
  }, [isConnected, walletAddress]);

  return (
    <div className="wallet-connection">
      <ConnectButton
        client={client}
        wallets={wallets}
        connectModal={{ size: "compact" }}
      />
      {isConnected && walletAddress && (
        <div className="mt-2 text-sm text-green-600">
          Connecté: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
        </div>
      )}
    </div>
  );
}
