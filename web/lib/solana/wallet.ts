import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const WALLET_STORAGE_KEY = "zpump_local_wallet";

export interface LocalWallet {
  publicKey: string;
  secretKey: string;
}

export function generateLocalWallet(): LocalWallet {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

export function saveLocalWallet(wallet: LocalWallet): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  }
}

export function loadLocalWallet(): LocalWallet | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(WALLET_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LocalWallet;
  } catch {
    return null;
  }
}

export function deleteLocalWallet(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }
}

export function walletToKeypair(wallet: LocalWallet): Keypair {
  return Keypair.fromSecretKey(bs58.decode(wallet.secretKey));
}

