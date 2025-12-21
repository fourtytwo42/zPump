"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { walletToKeypair } from "@/lib/solana/wallet";
import { useLocalWallet } from "./useLocalWallet";

export function useSolBalance() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { wallet: localWallet, mounted } = useLocalWallet();

  const walletPublicKey = publicKey || (mounted && localWallet ? new PublicKey(localWallet.publicKey) : null);

  return useQuery({
    queryKey: ["solBalance", walletPublicKey?.toBase58()],
    queryFn: async () => {
      if (!walletPublicKey) return 0;
      const balance = await connection.getBalance(walletPublicKey);
      return balance / LAMPORTS_PER_SOL;
    },
    enabled: !!walletPublicKey,
    refetchInterval: 5000,
  });
}

export function useTokenBalance(mint: PublicKey | null | undefined) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { wallet: localWallet, mounted } = useLocalWallet();

  const walletPublicKey = publicKey || (mounted && localWallet ? new PublicKey(localWallet.publicKey) : null);

  return useQuery({
    queryKey: ["tokenBalance", mint?.toBase58(), walletPublicKey?.toBase58()],
    queryFn: async () => {
      if (!walletPublicKey || !mint) return { amount: 0, decimals: 9 };
      try {
        const ata = await getAssociatedTokenAddress(mint, walletPublicKey);
        const account = await connection.getTokenAccountBalance(ata);
        return {
          amount: Number(account.value.amount),
          decimals: account.value.decimals,
        };
      } catch {
        return { amount: 0, decimals: 9 };
      }
    },
    enabled: !!walletPublicKey && !!mint,
    refetchInterval: 5000,
  });
}

export function useZTokenBalance(mint: PublicKey | null | undefined) {
  const { publicKey } = useWallet();
  const { wallet: localWallet, mounted } = useLocalWallet();
  const walletPublicKey = publicKey || (mounted && localWallet ? new PublicKey(localWallet.publicKey) : null);

  return useQuery({
    queryKey: ["zTokenBalance", mint?.toBase58(), walletPublicKey?.toBase58()],
    queryFn: async () => {
      if (!walletPublicKey || !mint) return { commitments: [], total: 0 };
      
      // TODO: Query indexer API for zToken balances
      // For now, return empty
      const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL || "http://127.0.0.1:8082";
      try {
        const response = await fetch(
          `${indexerUrl}/balance/${walletPublicKey.toBase58()}/${mint.toBase58()}`
        );
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (error) {
        console.error("Error fetching zToken balance:", error);
      }
      return { commitments: [], total: 0 };
    },
    enabled: !!walletPublicKey && !!mint,
    refetchInterval: 10000,
  });
}

