"use client";

import { useState, useEffect, useMemo } from "react";
import { loadLocalWallet, LocalWallet } from "@/lib/solana/wallet";

/**
 * Shared hook for loading local wallet
 * Memoizes the wallet to prevent unnecessary re-renders
 */
export function useLocalWallet() {
  const [mounted, setMounted] = useState(false);
  const [wallet, setWallet] = useState<LocalWallet | null>(null);

  useEffect(() => {
    setMounted(true);
    // Only load once after mount
    const loadedWallet = loadLocalWallet();
    setWallet(loadedWallet);
  }, []);

  // Memoize wallet to prevent unnecessary re-renders
  const memoizedWallet = useMemo(() => wallet, [wallet?.publicKey]);

  return {
    mounted,
    wallet: memoizedWallet,
    walletAddress: memoizedWallet?.publicKey || null,
  };
}

