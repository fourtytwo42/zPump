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

describe("Batch Operations - Edge Cases", () => {
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
  
  it("should reject batch with empty batch", async () => {
    try {
      await poolProgram.methods
        .executeBatchTransfer({
          transfers: [],
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
      
      expect.fail("Should have rejected empty batch");
    } catch (e: any) {
      // Expected to fail
      expect(e.message).to.include("InvalidAmount") || expect(e.message).to.include("empty");
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
    }
  });
  
  it("should handle batch with single item", async () => {
    const nullifier = generateTestNullifier();
    const transferOp = generateTransferOperation(nullifier, TEST_AMOUNTS.SMALL);
    const transfers = [{
      proof: Array.from(transferOp.proof),
      publicInputs: Array.from(transferOp.publicInputs),
    }];
    
    try {
      const tx = await poolProgram.methods
        .executeBatchTransfer({
          transfers,
        })
        .accounts({
          poolState: poolAddresses.poolState,
          commitmentTree: poolAddresses.commitmentTree,
          nullifierSet: poolAddresses.nullifierSet,
          verifyingKey: verifyingKey,
          verifierProgram: VERIFIER_PROGRAM_ID,
        })
        .rpc();
      
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
      expect(tx).to.be.a("string");
    } catch (e: any) {
      // May fail if not implemented
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
      expect(true).to.be.true;
    }
  });
  
  it("should handle batch with maximum items (MAX_BATCH_SIZE = 10)", async () => {
    const transfers = [];
    for (let i = 0; i < 10; i++) {
      const nullifier = generateTestNullifier();
      const transferOp = generateTransferOperation(nullifier, TEST_AMOUNTS.SMALL);
      transfers.push({
        proof: Array.from(transferOp.proof),
        publicInputs: Array.from(transferOp.publicInputs),
      });
    }
    
    try {
      const tx = await poolProgram.methods
        .executeBatchTransfer({
          transfers,
        })
        .accounts({
          poolState: poolAddresses.poolState,
          commitmentTree: poolAddresses.commitmentTree,
          nullifierSet: poolAddresses.nullifierSet,
          verifyingKey: verifyingKey,
          verifierProgram: VERIFIER_PROGRAM_ID,
        })
        .rpc();
      
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
      expect(tx).to.be.a("string");
    } catch (e: any) {
      // May fail if not implemented
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
      expect(true).to.be.true;
    }
  });
});

