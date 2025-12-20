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

/**
 * Test scenarios for different operation types
 */
export interface ShieldScenario {
  amount: number;
  commitment: Uint8Array;
  description: string;
}

export interface UnshieldScenario {
  nullifier: Uint8Array;
  amount: number;
  recipient: PublicKey;
  description: string;
}

export interface TransferScenario {
  nullifier: Uint8Array;
  commitment: Uint8Array;
  amount: number;
  description: string;
}

/**
 * Generate shield test scenarios
 */
export function generateShieldScenarios(): ShieldScenario[] {
  return [
    {
      amount: TEST_AMOUNTS.MIN,
      commitment: generateTestCommitment(),
      description: "Minimum amount shield",
    },
    {
      amount: TEST_AMOUNTS.SMALL,
      commitment: generateTestCommitment(),
      description: "Small amount shield",
    },
    {
      amount: TEST_AMOUNTS.MEDIUM,
      commitment: generateTestCommitment(),
      description: "Medium amount shield",
    },
    {
      amount: TEST_AMOUNTS.LARGE,
      commitment: generateTestCommitment(),
      description: "Large amount shield",
    },
  ];
}

/**
 * Generate unshield test scenarios
 */
export function generateUnshieldScenarios(recipient: PublicKey): UnshieldScenario[] {
  return [
    {
      nullifier: generateTestNullifier(),
      amount: TEST_AMOUNTS.MIN,
      recipient,
      description: "Minimum amount unshield",
    },
    {
      nullifier: generateTestNullifier(),
      amount: TEST_AMOUNTS.SMALL,
      recipient,
      description: "Small amount unshield",
    },
    {
      nullifier: generateTestNullifier(),
      amount: TEST_AMOUNTS.MEDIUM,
      recipient,
      description: "Medium amount unshield",
    },
  ];
}

/**
 * Generate transfer test scenarios
 */
export function generateTransferScenarios(): TransferScenario[] {
  return [
    {
      nullifier: generateTestNullifier(),
      commitment: generateTestCommitment(),
      amount: TEST_AMOUNTS.SMALL,
      description: "Small amount transfer",
    },
    {
      nullifier: generateTestNullifier(),
      commitment: generateTestCommitment(),
      amount: TEST_AMOUNTS.MEDIUM,
      description: "Medium amount transfer",
    },
  ];
}

/**
 * Generate multi-user test data
 */
export function generateMultiUserData(count: number): {
  users: Keypair[];
  commitments: Uint8Array[];
  nullifiers: Uint8Array[];
} {
  const users: Keypair[] = [];
  const commitments: Uint8Array[] = [];
  const nullifiers: Uint8Array[] = [];
  
  for (let i = 0; i < count; i++) {
    users.push(generateTestKeypair());
    commitments.push(generateTestCommitment());
    nullifiers.push(generateTestNullifier());
  }
  
  return { users, commitments, nullifiers };
}

/**
 * Edge case test data
 */
export const EDGE_CASE_DATA = {
  invalidAmount: 0,
  tooLargeAmount: Number.MAX_SAFE_INTEGER + 1,
  invalidCommitment: new Uint8Array(31), // Wrong size
  invalidNullifier: new Uint8Array(31), // Wrong size
  emptyCommitment: new Uint8Array(32).fill(0),
  emptyNullifier: new Uint8Array(32).fill(0),
};

