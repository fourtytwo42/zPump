import { PublicKey, Keypair } from "@solana/web3.js";

export const TEST_AMOUNTS = {
  MIN: 1,
  SMALL: 1000,
  MEDIUM: 1000000,
  LARGE: 1000000000,
  MAX: Number.MAX_SAFE_INTEGER,
};

export const TEST_COMMITMENTS: Uint8Array[] = [
  new Uint8Array(32).fill(1),
  new Uint8Array(32).fill(2),
  new Uint8Array(32).fill(3),
];

export const TEST_NULLIFIERS: Uint8Array[] = [
  new Uint8Array(32).fill(10),
  new Uint8Array(32).fill(20),
  new Uint8Array(32).fill(30),
];

export function generateTestKeypair(): Keypair {
  return Keypair.generate();
}

export function generateTestCommitment(): Uint8Array {
  const commitment = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    commitment[i] = Math.floor(Math.random() * 256);
  }
  return commitment;
}

export function generateTestNullifier(): Uint8Array {
  const nullifier = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    nullifier[i] = Math.floor(Math.random() * 256);
  }
  return nullifier;
}

