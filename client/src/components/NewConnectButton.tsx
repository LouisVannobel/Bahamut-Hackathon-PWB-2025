import React from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton } from "thirdweb/react";

import {
  inAppWallet,
  createWallet,
} from "thirdweb/wallets";

const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
});

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

export default function NewConnectButton() {
  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      connectModal={{ size: "compact" }}
    />
  );
}
