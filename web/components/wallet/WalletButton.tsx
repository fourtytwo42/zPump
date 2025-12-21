"use client";

import { MetaMaskStyleWallet } from "./MetaMaskStyleWallet";

export function WalletButton() {
  // Always use MetaMask-style wallet for development
  return <MetaMaskStyleWallet />;
}
