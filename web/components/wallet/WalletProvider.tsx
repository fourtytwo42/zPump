"use client";

import { useMemo, ReactNode, useState, useEffect } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { connection } from "@/lib/solana/connection";
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const network = process.env.NEXT_PUBLIC_NETWORK === "localnet" 
    ? WalletAdapterNetwork.Devnet 
    : WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => {
      // Only create wallets after mount to avoid SSR issues
      if (!mounted || typeof window === "undefined") return [];
      
      // For localnet, we don't need any adapters - we use MetaMaskStyleWallet directly
      if (process.env.NEXT_PUBLIC_NETWORK === "localnet") {
        return [];
      }
      
      // Only add Solflare for non-localnet (Phantom is auto-detected as Standard Wallet)
      return [new SolflareWalletAdapter()];
    },
    [mounted]
  );

  // For localnet, we'll use a custom RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_NETWORK === "localnet") {
      return "http://127.0.0.1:8899";
    }
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
  }, [network]);

  // Always provide the context, but only initialize wallets after mount
  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={mounted ? wallets : []} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
