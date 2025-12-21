"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { generateLocalWallet, saveLocalWallet, loadLocalWallet, deleteLocalWallet, walletToKeypair } from "@/lib/solana/wallet";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { connection } = useConnection();
  const [localWallet, setLocalWallet] = useState(loadLocalWallet());
  const [localBalance, setLocalBalance] = useState<number | null>(null);

  const handleCreateLocalWallet = () => {
    const wallet = generateLocalWallet();
    saveLocalWallet(wallet);
    setLocalWallet(wallet);
    // Load balance
    loadLocalBalance(wallet);
  };

  const loadLocalBalance = async (wallet: typeof localWallet) => {
    if (!wallet) return;
    try {
      const keypair = walletToKeypair(wallet);
      const balance = await connection.getBalance(keypair.publicKey);
      setLocalBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error loading local balance:", error);
    }
  };

  const handleDisconnectLocal = () => {
    deleteLocalWallet();
    setLocalWallet(null);
    setLocalBalance(null);
  };

  // If Phantom is connected, show it
  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <WalletMultiButton />
      </div>
    );
  }

  // Otherwise, show local wallet option
  return (
    <div className="flex flex-col gap-2">
      {localWallet ? (
        <div className="flex flex-col gap-2 p-4 border rounded-lg">
          <div className="text-sm font-medium">Local Wallet (Development Only)</div>
          <div className="text-xs text-muted-foreground break-all">
            {localWallet.publicKey}
          </div>
          {localBalance !== null && (
            <div className="text-sm">
              Balance: {localBalance.toFixed(4)} SOL
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleDisconnectLocal}>
            Delete Local Wallet
          </Button>
        </div>
      ) : (
        <Button onClick={handleCreateLocalWallet} variant="outline">
          Create Local Wallet
        </Button>
      )}
      <WalletMultiButton />
    </div>
  );
}

