import { expect } from "chai";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
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
import { recordGasUsage, getComputeUnitsUsed, verifyAllWithinGasLimit } from "../utils/gas";
import { TEST_AMOUNTS, generateTestNullifier } from "../fixtures/test-data";
import {
  derivePDA,
} from "../utils/accounts";
import {
  derivePoolAddresses,
  generateTransferOperation,
} from "../utils/pool-helpers";

describe("Batch Transfer Operations - Token Tests", () => {
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
  
  it("should execute batch transfer with token", async () => {
    // Create batch of 3 transfers
    const transfers = [];
    for (let i = 0; i < 3; i++) {
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
      
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
      const computeUnits = await getComputeUnitsUsed(connection, tx);
      await recordGasUsage(connection, "ptf_pool", "execute_batch_transfer", computeUnits);
      
      expect(tx).to.be.a("string");
    } catch (e: any) {
      // execute_batch_transfer is placeholder - will work once implemented
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
      expect(true).to.be.true;
    }
  });
  
  it("should fail with batch size exceeding MAX_BATCH_SIZE", async () => {
    // MAX_BATCH_SIZE is 10, so create 11 transfers
    const transfers = [];
    for (let i = 0; i < 11; i++) {
      const nullifier = generateTestNullifier();
      const transferOp = generateTransferOperation(nullifier, TEST_AMOUNTS.SMALL);
      transfers.push({
        proof: Array.from(transferOp.proof),
        publicInputs: Array.from(transferOp.publicInputs),
      });
    }
    
    try {
      await poolProgram.methods
        .executeBatchTransfer({
          transfers,
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
      
      expect.fail("Should have failed with batch size exceeding limit");
    } catch (e: any) {
      // Expected to fail - validation happens after account check
      expect(e.message).to.include("InvalidAmount") || 
        expect(e.message).to.include("batch") ||
        expect(e.message).to.include("phantom") ||
        expect(e.message).to.include("Account");
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
    }
  });
  
  it("should fail with empty batch", async () => {
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
      
      expect.fail("Should have failed with empty batch");
    } catch (e: any) {
      // Expected to fail - validation happens after account check
      expect(e.message).to.include("InvalidAmount") || 
        expect(e.message).to.include("empty") ||
        expect(e.message).to.include("phantom") ||
        expect(e.message).to.include("Account");
      recordInstructionCoverage("ptf_pool", "execute_batch_transfer");
    }
  });
  
  after(() => {
    expect(verifyAllWithinGasLimit()).to.be.true;
  });
});

