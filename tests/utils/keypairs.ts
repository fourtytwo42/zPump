import { Keypair } from "@solana/web3.js";

export function generateKeypair(): Keypair {
  return Keypair.generate();
}

export function generateKeypairs(count: number): Keypair[] {
  return Array.from({ length: count }, () => generateKeypair());
}

export function keypairFromSecretKey(secretKey: Uint8Array): Keypair {
  return Keypair.fromSecretKey(secretKey);
}

