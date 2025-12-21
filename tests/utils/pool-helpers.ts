import {
  Connection,
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { POOL_PROGRAM_ID, VERIFIER_PROGRAM_ID } from "./programs";
import { derivePDA } from "./accounts";
import { generateTestCommitment, generateTestNullifier } from "../fixtures/test-data";
import { generateShieldProof, generateUnshieldProof, generateTransferProof, proofToBytes, generateRealProof } from "./proofs";
import { ExternalVerifierClient, VerificationAttestation } from "./external-verifier";

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
 * Derive vault state PDA for a mint (alias)
 */
export function deriveVaultState(originMint: PublicKey, vaultProgramId: PublicKey): [PublicKey, number] {
  return deriveVaultStateForMint(originMint, vaultProgramId);
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
 * Get verifying key bytes from verifying key account
 */
export async function getVerifyingKeyBytes(
  connection: Connection,
  verifyingKey: PublicKey,
): Promise<Uint8Array> {
  const accountInfo = await connection.getAccountInfo(verifyingKey);
  if (!accountInfo) {
    throw new Error(`Verifying key account not found: ${verifyingKey.toString()}`);
  }
  
  // Parse account data: discriminator (8) + circuitTag (32) + version (4) + Vec length (4) + key_data (variable)
  const data = accountInfo.data;
  if (data.length < 8 + 32 + 4 + 4) {
    throw new Error("Invalid verifying key account data");
  }
  
  // Skip discriminator (8) + circuitTag (32) + version (4) = 44 bytes
  // Read Vec length (4 bytes, little-endian)
  const vecLength = data.readUInt32LE(44);
  
  // Extract key_data (starts at offset 48)
  const keyDataStart = 48;
  const keyDataEnd = keyDataStart + vecLength;
  
  if (data.length < keyDataEnd) {
    throw new Error("Invalid verifying key account data length");
  }
  
  return Uint8Array.from(data.slice(keyDataStart, keyDataEnd));
}

/**
 * Convert attestation to bytes for operation data
 * Format: proof_hash (32) + public_inputs_hash (32) + verifying_key_hash (32) + 
 *         is_valid (1) + timestamp (8) + signature (64) = 169 bytes
 */
export function attestationToBytes(attestation: VerificationAttestation): Uint8Array {
  const buffer = Buffer.alloc(169);
  let offset = 0;
  
  // proof_hash (32 bytes)
  const proofHash = Buffer.from(attestation.proof_hash, "hex");
  proofHash.copy(buffer, offset);
  offset += 32;
  
  // public_inputs_hash (32 bytes)
  const publicInputsHash = Buffer.from(attestation.public_inputs_hash, "hex");
  publicInputsHash.copy(buffer, offset);
  offset += 32;
  
  // verifying_key_hash (32 bytes)
  const verifyingKeyHash = Buffer.from(attestation.verifying_key_hash, "hex");
  verifyingKeyHash.copy(buffer, offset);
  offset += 32;
  
  // is_valid (1 byte)
  buffer[offset] = attestation.is_valid ? 1 : 0;
  offset += 1;
  
  // timestamp (8 bytes, little-endian)
  buffer.writeBigInt64LE(BigInt(attestation.timestamp), offset);
  offset += 8;
  
  // signature (64 bytes)
  const signature = Buffer.from(attestation.signature, "hex");
  signature.copy(buffer, offset);
  offset += 64;
  
  return Uint8Array.from(buffer);
}

/**
 * Generate shield proof and data with attestation
 * Uses real proof generation and external verifier if available, falls back to mock
 */
export async function generateShieldOperation(
  amount: number,
  useRealProof: boolean = false,
  proofServiceUrl?: string,
  externalVerifierUrl?: string,
  verifyingKey?: PublicKey,
  connection?: Connection,
): Promise<{ 
  commitment: Uint8Array; 
  proof: Uint8Array; 
  publicInputs: Uint8Array; 
  operationId: Uint8Array;
  operationData: Uint8Array; // proof + attestation + publicInputs
  attestation?: VerificationAttestation;
}> {
  const commitment = generateTestCommitment();
  
  let proofData;
  if (useRealProof) {
    proofData = await generateRealProof("shield", { commitment, amount }, proofServiceUrl);
  } else {
    proofData = generateShieldProof(commitment, amount);
  }
  
  const { proof, publicInputs } = proofToBytes(proofData);
  const shieldData = prepareShieldData(amount, commitment);
  
  // Get attestation from external verifier if available
  let attestation: VerificationAttestation | undefined;
  let operationData: Uint8Array;
  
  if (useRealProof && externalVerifierUrl && verifyingKey && connection) {
    try {
      const verifierClient = new ExternalVerifierClient({ url: externalVerifierUrl });
      const isAvailable = await verifierClient.healthCheck();
      
      if (isAvailable) {
        const verifyingKeyBytes = await getVerifyingKeyBytes(connection, verifyingKey);
        const verifyResponse = await verifierClient.verifyProof(proof, publicInputs, verifyingKeyBytes);
        
        if (verifyResponse.is_valid) {
          attestation = verifyResponse.attestation;
          
          // Format operation data: [proof (256)][attestation (169)][public_inputs (variable)]
          const attestationBytes = attestationToBytes(attestation);
          operationData = new Uint8Array(256 + 169 + publicInputs.length);
          operationData.set(proof, 0);
          operationData.set(attestationBytes, 256);
          operationData.set(publicInputs, 256 + 169);
        } else {
          throw new Error("Proof verification failed");
        }
      } else {
        // External verifier not available, use proof only
        operationData = new Uint8Array(256 + publicInputs.length);
        operationData.set(proof, 0);
        operationData.set(publicInputs, 256);
      }
    } catch (e) {
      console.warn(`Failed to get attestation: ${e}, using proof only`);
      operationData = new Uint8Array(256 + publicInputs.length);
      operationData.set(proof, 0);
      operationData.set(publicInputs, 256);
    }
  } else {
    // No external verifier, use proof only (for mock proofs)
    operationData = new Uint8Array(256 + publicInputs.length);
    operationData.set(proof, 0);
    operationData.set(publicInputs, 256);
  }
  
  return {
    commitment,
    proof,
    publicInputs,
    operationId: shieldData.operationId,
    operationData,
    attestation,
  };
}

/**
 * Generate unshield proof and data with attestation
 * Uses real proof generation and external verifier if available, falls back to mock
 */
export async function generateUnshieldOperation(
  amount: number,
  recipient: PublicKey,
  useRealProof: boolean = false,
  proofServiceUrl?: string,
  externalVerifierUrl?: string,
  verifyingKey?: PublicKey,
  connection?: Connection,
): Promise<{ 
  nullifier: Uint8Array; 
  proof: Uint8Array; 
  publicInputs: Uint8Array; 
  operationId: Uint8Array;
  operationData: Uint8Array; // proof + attestation + publicInputs
  attestation?: VerificationAttestation;
}> {
  const nullifier = generateTestNullifier();
  
  let proofData;
  if (useRealProof) {
    proofData = await generateRealProof("unshield", { nullifier, amount, recipient: recipient.toBuffer() }, proofServiceUrl);
  } else {
    proofData = generateUnshieldProof(nullifier, amount, recipient.toBuffer());
  }
  
  const { proof, publicInputs } = proofToBytes(proofData);
  const unshieldData = prepareUnshieldData(nullifier, amount, recipient);
  
  // Get attestation from external verifier if available
  let attestation: VerificationAttestation | undefined;
  let operationData: Uint8Array;
  
  if (useRealProof && externalVerifierUrl && verifyingKey && connection) {
    try {
      const verifierClient = new ExternalVerifierClient({ url: externalVerifierUrl });
      const isAvailable = await verifierClient.healthCheck();
      
      if (isAvailable) {
        const verifyingKeyBytes = await getVerifyingKeyBytes(connection, verifyingKey);
        const verifyResponse = await verifierClient.verifyProof(proof, publicInputs, verifyingKeyBytes);
        
        if (verifyResponse.is_valid) {
          attestation = verifyResponse.attestation;
          
          // Format operation data: [proof (256)][attestation (169)][public_inputs (variable)]
          const attestationBytes = attestationToBytes(attestation);
          operationData = new Uint8Array(256 + 169 + publicInputs.length);
          operationData.set(proof, 0);
          operationData.set(attestationBytes, 256);
          operationData.set(publicInputs, 256 + 169);
        } else {
          throw new Error("Proof verification failed");
        }
      } else {
        // External verifier not available, use proof only
        operationData = new Uint8Array(256 + publicInputs.length);
        operationData.set(proof, 0);
        operationData.set(publicInputs, 256);
      }
    } catch (e) {
      console.warn(`Failed to get attestation: ${e}, using proof only`);
      operationData = new Uint8Array(256 + publicInputs.length);
      operationData.set(proof, 0);
      operationData.set(publicInputs, 256);
    }
  } else {
    // No external verifier, use proof only (for mock proofs)
    operationData = new Uint8Array(256 + publicInputs.length);
    operationData.set(proof, 0);
    operationData.set(publicInputs, 256);
  }
  
  return {
    nullifier,
    proof,
    publicInputs,
    operationId: unshieldData.operationId,
    operationData,
    attestation,
  };
}

/**
 * Generate transfer proof and data with attestation
 * Uses real proof generation and external verifier if available, falls back to mock
 */
export async function generateTransferOperation(
  nullifier: Uint8Array,
  amount: number,
  useRealProof: boolean = false,
  proofServiceUrl?: string,
  externalVerifierUrl?: string,
  verifyingKey?: PublicKey,
  connection?: Connection,
): Promise<{ 
  commitment: Uint8Array; 
  proof: Uint8Array; 
  publicInputs: Uint8Array;
  attestation?: VerificationAttestation;
}> {
  const commitment = generateTestCommitment();
  
  let proofData;
  if (useRealProof) {
    proofData = await generateRealProof("transfer", { nullifier, commitment, amount }, proofServiceUrl);
  } else {
    proofData = generateTransferProof(nullifier, commitment, amount);
  }
  
  const { proof, publicInputs } = proofToBytes(proofData);
  
  // Get attestation from external verifier if available
  let attestation: VerificationAttestation | undefined;
  
  if (useRealProof && externalVerifierUrl && verifyingKey && connection) {
    try {
      const verifierClient = new ExternalVerifierClient({ url: externalVerifierUrl });
      const isAvailable = await verifierClient.healthCheck();
      
      if (isAvailable) {
        const verifyingKeyBytes = await getVerifyingKeyBytes(connection, verifyingKey);
        const verifyResponse = await verifierClient.verifyProof(proof, publicInputs, verifyingKeyBytes);
        
        if (verifyResponse.is_valid) {
          attestation = verifyResponse.attestation;
        } else {
          throw new Error("Proof verification failed");
        }
      }
    } catch (e) {
      console.warn(`Failed to get attestation: ${e}`);
    }
  }
  
  return {
    commitment,
    proof,
    publicInputs,
    attestation,
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
    return await (program.account as any).poolState.fetch(poolState);
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
    return await (program.account as any).commitmentTree.fetch(commitmentTree);
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
    return await (program.account as any).nullifierSet.fetch(nullifierSet);
  } catch (e) {
    return null;
  }
}

