import {
  Connection,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { POOL_PROGRAM_ID } from "./programs";
import { derivePDA } from "./accounts";
import { generateTestCommitment, generateTestNullifier } from "../fixtures/test-data";
import { generateShieldProof, generateUnshieldProof, generateTransferProof, proofToBytes } from "./proofs";

export interface PoolAddresses {
  poolState: PublicKey;
  commitmentTree: PublicKey;
  nullifierSet: PublicKey;
  noteLedger: PublicKey;
  hookConfig: PublicKey;
  hookWhitelist: PublicKey;
}

/**
 * Derive all pool addresses for a given mint
 */
export function derivePoolAddresses(originMint: PublicKey): PoolAddresses {
  const [poolState] = derivePDA(
    [Buffer.from("pool"), originMint.toBuffer()],
    POOL_PROGRAM_ID,
  );
  
  const [commitmentTree] = derivePDA(
    [Buffer.from("commitment-tree"), originMint.toBuffer()],
    POOL_PROGRAM_ID,
  );
  
  const [nullifierSet] = derivePDA(
    [Buffer.from("nullifier-set"), originMint.toBuffer()],
    POOL_PROGRAM_ID,
  );
  
  const [noteLedger] = derivePDA(
    [Buffer.from("note-ledger"), originMint.toBuffer()],
    POOL_PROGRAM_ID,
  );
  
  const [hookConfig] = derivePDA(
    [Buffer.from("hook-config"), originMint.toBuffer()],
    POOL_PROGRAM_ID,
  );
  
  const [hookWhitelist] = derivePDA(
    [Buffer.from("hook-whitelist"), originMint.toBuffer()],
    POOL_PROGRAM_ID,
  );
  
  return {
    poolState,
    commitmentTree,
    nullifierSet,
    noteLedger,
    hookConfig,
    hookWhitelist,
  };
}

/**
 * Derive proof vault PDA for a user
 */
export function deriveProofVault(user: PublicKey): [PublicKey, number] {
  return derivePDA(
    [Buffer.from("proof-vault"), user.toBuffer()],
    POOL_PROGRAM_ID,
  );
}

/**
 * Derive vault state PDA for a mint
 */
export function deriveVaultStateForMint(originMint: PublicKey, vaultProgramId: PublicKey): [PublicKey, number] {
  return derivePDA(
    [Buffer.from("vault"), originMint.toBuffer()],
    vaultProgramId,
  );
}

/**
 * Derive vault state PDA for a mint
 */
export function deriveVaultState(originMint: PublicKey, vaultProgramId: PublicKey): [PublicKey, number] {
  return derivePDA(
    [Buffer.from("vault"), originMint.toBuffer()],
    vaultProgramId,
  );
}

/**
 * Derive allowance PDA
 */
export function deriveAllowance(
  owner: PublicKey,
  spender: PublicKey,
  pool: PublicKey,
): [PublicKey, number] {
  return derivePDA(
    [
      Buffer.from("allowance"),
      owner.toBuffer(),
      spender.toBuffer(),
      pool.toBuffer(),
    ],
    POOL_PROGRAM_ID,
  );
}

/**
 * Generate operation ID (hash of operation data)
 * This matches the placeholder in prepare_shield/prepare_unshield
 */
export function generateOperationId(data: Uint8Array): Uint8Array {
  // For now, use a simple hash-like function
  // In production, this would use keccak hash
  const hash = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hash[i] = data[i % data.length] ^ (i * 7);
  }
  return hash;
}

/**
 * Prepare shield operation data
 */
export function prepareShieldData(
  amount: number,
  commitment: Uint8Array,
): { operationId: Uint8Array; commitment: Uint8Array; amount: number } {
  const operationData = new Uint8Array(40);
  const amountBytes = new Uint8Array(8);
  const view = new DataView(amountBytes.buffer);
  view.setBigUint64(0, BigInt(amount), true);
  
  operationData.set(commitment, 0);
  operationData.set(amountBytes, 32);
  
  const operationId = generateOperationId(operationData);
  
  return {
    operationId,
    commitment,
    amount,
  };
}

/**
 * Prepare unshield operation data
 */
export function prepareUnshieldData(
  nullifier: Uint8Array,
  amount: number,
  recipient: PublicKey,
): { operationId: Uint8Array; nullifier: Uint8Array; amount: number; recipient: PublicKey } {
  const operationData = new Uint8Array(72);
  const amountBytes = new Uint8Array(8);
  const view = new DataView(amountBytes.buffer);
  view.setBigUint64(0, BigInt(amount), true);
  
  operationData.set(nullifier, 0);
  operationData.set(amountBytes, 32);
  operationData.set(recipient.toBuffer(), 40);
  
  const operationId = generateOperationId(operationData);
  
  return {
    operationId,
    nullifier,
    amount,
    recipient,
  };
}

/**
 * Generate shield proof and data
 */
export function generateShieldOperation(
  amount: number,
): { commitment: Uint8Array; proof: Uint8Array; publicInputs: Uint8Array; operationId: Uint8Array } {
  const commitment = generateTestCommitment();
  const proofData = generateShieldProof(commitment, amount);
  const { proof, publicInputs } = proofToBytes(proofData);
  const shieldData = prepareShieldData(amount, commitment);
  
  return {
    commitment,
    proof,
    publicInputs,
    operationId: shieldData.operationId,
  };
}

/**
 * Generate unshield proof and data
 */
export function generateUnshieldOperation(
  amount: number,
  recipient: PublicKey,
): { nullifier: Uint8Array; proof: Uint8Array; publicInputs: Uint8Array; operationId: Uint8Array } {
  const nullifier = generateTestNullifier();
  const proofData = generateUnshieldProof(nullifier, amount, recipient.toBuffer());
  const { proof, publicInputs } = proofToBytes(proofData);
  const unshieldData = prepareUnshieldData(nullifier, amount, recipient);
  
  return {
    nullifier,
    proof,
    publicInputs,
    operationId: unshieldData.operationId,
  };
}

/**
 * Generate transfer proof and data
 */
export function generateTransferOperation(
  nullifier: Uint8Array,
  amount: number,
): { commitment: Uint8Array; proof: Uint8Array; publicInputs: Uint8Array } {
  const commitment = generateTestCommitment();
  const proofData = generateTransferProof(nullifier, commitment, amount);
  const { proof, publicInputs } = proofToBytes(proofData);
  
  return {
    commitment,
    proof,
    publicInputs,
  };
}

/**
 * Get pool state account
 */
export async function getPoolState(
  program: Program,
  poolState: PublicKey,
): Promise<any | null> {
  try {
    return await program.account.poolState.fetch(poolState);
  } catch (e) {
    return null;
  }
}

/**
 * Get commitment tree account
 */
export async function getCommitmentTree(
  program: Program,
  commitmentTree: PublicKey,
): Promise<any | null> {
  try {
    return await program.account.commitmentTree.fetch(commitmentTree);
  } catch (e) {
    return null;
  }
}

/**
 * Get nullifier set account
 */
export async function getNullifierSet(
  program: Program,
  nullifierSet: PublicKey,
): Promise<any | null> {
  try {
    return await program.account.nullifierSet.fetch(nullifierSet);
  } catch (e) {
    return null;
  }
}

