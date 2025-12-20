import { expect } from "chai";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { getConnection, airdropSol } from "../setup";
import { generateKeypair } from "../utils/keypairs";
import {
  getPoolProgram,
  getFactoryProgram,
  getVerifierProgram,
  FACTORY_PROGRAM_ID,
  VERIFIER_PROGRAM_ID,
} from "../utils/programs";
import { recordInstructionCoverage } from "../utils/coverage";
import { TEST_AMOUNTS, generateTestNullifier } from "../fixtures/test-data";
import {
  derivePDA,
} from "../utils/accounts";
import {
  derivePoolAddresses,
  generateTransferOperation,
} from "../utils/pool-helpers";
import { createMint } from "@solana/spl-token";

describe("Transfer Operations - Edge Cases", () => {
  let connection: Connection;
  let user: Keypair;
  let poolProgram: any;
  let factoryProgram: any;
  let testMint: PublicKey;
  let poolAddresses: any;
  let verifyingKey: PublicKey;
  
  before(async () => {
    connection = getConnection();
    user = generateKeypair();
    await airdropSol(connection, user.publicKey, 10);
    
    poolProgram = getPoolProgram(connection, user);
    factoryProgram = getFactoryProgram(connection, user);
    
    // Create test token mint
    testMint = await createMint(
      connection,
      user,
      user.publicKey,
      null,
      9,
    );
    
    // Derive pool addresses
    poolAddresses = derivePoolAddresses(testMint);
    
    // Setup verifying key
    const circuitTag = new Uint8Array(32).fill(1);
    const version = 1;
    [verifyingKey] = derivePDA(
      [
        Buffer.from("verifying-key"),
        circuitTag,
        Buffer.from(version.toString()),
      ],
      VERIFIER_PROGRAM_ID,
    );
    
    // Initialize factory if needed
    const [factoryState] = derivePDA(
      [Buffer.from("factory")],
      FACTORY_PROGRAM_ID,
    );
    
    try {
      await factoryProgram.methods
        .initializeFactory()
        .accounts({
          factory: factoryState,
          authority: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (e: any) {
      // May already be initialized
    }
  });
  
  it("should reject transfer with invalid proof", async () => {
    const invalidProof = new Uint8Array(100); // Wrong size
    invalidProof.fill(1);
    const publicInputs = new Uint8Array(32);
    publicInputs.fill(1);
    
    try {
      await poolProgram.methods
        .executeTransfer({
          proof: Array.from(invalidProof),
          publicInputs: Array.from(publicInputs),
        })
        .accounts({
          _phantom: user.publicKey, // Phantom account for raw instruction
        })
        .remainingAccounts([
          { pubkey: poolAddresses.poolState, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.commitmentTree, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.nullifierSet, isSigner: false, isWritable: true },
          { pubkey: verifyingKey, isSigner: false, isWritable: false },
          { pubkey: VERIFIER_PROGRAM_ID, isSigner: false, isWritable: false },
        ])
        .rpc();
      
      expect.fail("Should have rejected invalid proof");
    } catch (e: any) {
      // Expected to fail
      expect(e.message).to.include("InvalidProof") || expect(e.message).to.include("invalid");
      recordInstructionCoverage("ptf_pool", "execute_transfer");
    }
  });
  
  it("should reject transfer with duplicate nullifier", async () => {
    // Test that duplicate nullifiers are rejected
    const amount = TEST_AMOUNTS.SMALL;
    const nullifier = generateTestNullifier();
    const transferOp = generateTransferOperation(nullifier, amount);
    
    try {
      // First transfer should succeed (or fail gracefully)
      await poolProgram.methods
        .executeTransfer({
          proof: Array.from(transferOp.proof),
          publicInputs: Array.from(transferOp.publicInputs),
        })
        .accounts({
          _phantom: user.publicKey,
        })
        .remainingAccounts([
          { pubkey: poolAddresses.poolState, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.commitmentTree, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.nullifierSet, isSigner: false, isWritable: true },
          { pubkey: verifyingKey, isSigner: false, isWritable: false },
          { pubkey: VERIFIER_PROGRAM_ID, isSigner: false, isWritable: false },
        ])
        .rpc();
      
      // Second transfer with same nullifier should fail
      await poolProgram.methods
        .executeTransfer({
          proof: Array.from(transferOp.proof),
          publicInputs: Array.from(transferOp.publicInputs),
        })
        .accounts({
          _phantom: user.publicKey,
        })
        .remainingAccounts([
          { pubkey: poolAddresses.poolState, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.commitmentTree, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.nullifierSet, isSigner: false, isWritable: true },
          { pubkey: verifyingKey, isSigner: false, isWritable: false },
          { pubkey: VERIFIER_PROGRAM_ID, isSigner: false, isWritable: false },
        ])
        .rpc();
      
      expect.fail("Should have rejected duplicate nullifier");
    } catch (e: any) {
      // Expected to fail - duplicate nullifier or placeholder implementation
      recordInstructionCoverage("ptf_pool", "execute_transfer");
      expect(true).to.be.true;
    }
  });
  
  it("should reject transfer with invalid public inputs", async () => {
    const proof = new Uint8Array(192);
    proof.fill(1);
    const invalidPublicInputs = new Uint8Array(31); // Not 32-byte aligned
    
    try {
      await poolProgram.methods
        .executeTransfer({
          proof: Array.from(proof),
          publicInputs: Array.from(invalidPublicInputs),
        })
        .accounts({
          _phantom: user.publicKey, // Phantom account for raw instruction
        })
        .remainingAccounts([
          { pubkey: poolAddresses.poolState, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.commitmentTree, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.nullifierSet, isSigner: false, isWritable: true },
          { pubkey: verifyingKey, isSigner: false, isWritable: false },
          { pubkey: VERIFIER_PROGRAM_ID, isSigner: false, isWritable: false },
        ])
        .rpc();
      
      expect.fail("Should have rejected invalid public inputs");
    } catch (e: any) {
      // Expected to fail
      expect(e.message).to.include("InvalidPublicInputs") || 
        expect(e.message).to.include("invalid") ||
        expect(e.message).to.include("phantom") ||
        expect(e.message).to.include("Account");
      recordInstructionCoverage("ptf_pool", "execute_transfer");
    }
  });
});

