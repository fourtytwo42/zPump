"use client";

import { useMemo, ReactNode } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { connection } from "@/lib/solana/connection";
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const network = process.env.NEXT_PUBLIC_NETWORK === "localnet" 
    ? WalletAdapterNetwork.Devnet 
    : WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // For localnet, we'll use a custom RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_NETWORK === "localnet") {
      return "http://127.0.0.1:8899";
    }
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
  }, [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

