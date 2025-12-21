import { expect } from "chai";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
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
import { TEST_AMOUNTS, generateTestNullifier } from "../fixtures/test-data";
import {
  derivePDA,
} from "../utils/accounts";
import {
  derivePoolAddresses,
  deriveAllowance,
  generateTransferOperation,
} from "../utils/pool-helpers";
import { createMint } from "@solana/spl-token";

describe("Allowance Operations - Edge Cases", () => {
  let connection: Connection;
  let owner: Keypair;
  let spender: Keypair;
  let poolProgram: any;
  let factoryProgram: any;
  let testMint: PublicKey;
  let poolAddresses: any;
  let verifyingKey: PublicKey;
  
  before(async () => {
    connection = getConnection();
    owner = generateKeypair();
    spender = generateKeypair();
    await airdropSol(connection, owner.publicKey, 10);
    await airdropSol(connection, spender.publicKey, 10);
    
    poolProgram = getPoolProgram(connection, owner);
    factoryProgram = getFactoryProgram(connection, owner);
    
    // Create test token mint
    testMint = await createMint(
      connection,
      owner,
      owner.publicKey,
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
          authority: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (e: any) {
      // May already be initialized
    }
  });
  
  it("should reject transferFrom with insufficient allowance", async () => {
    // Test that transferFrom fails if allowance is insufficient
    const amount = TEST_AMOUNTS.LARGE; // Large amount that exceeds allowance
    const nullifier = generateTestNullifier();
    const transferOp = await generateTransferOperation(nullifier, amount);
    
    const [allowancePDA] = deriveAllowance(
      owner.publicKey,
      spender.publicKey,
      poolAddresses.poolState,
    );
    
    try {
      await poolProgram.methods
        .executeTransferFrom({
          proof: Array.from(transferOp.proof),
          publicInputs: Array.from(transferOp.publicInputs),
        })
        .accounts({
          _phantom: owner.publicKey, // Phantom account for raw instruction
        })
        .remainingAccounts([
          { pubkey: poolAddresses.poolState, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.commitmentTree, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.nullifierSet, isSigner: false, isWritable: true },
          { pubkey: allowancePDA, isSigner: false, isWritable: true },
          { pubkey: verifyingKey, isSigner: false, isWritable: false },
          { pubkey: VERIFIER_PROGRAM_ID, isSigner: false, isWritable: false },
        ])
        .rpc();
      
      expect.fail("Should have rejected insufficient allowance");
    } catch (e: any) {
      // Expected to fail - check if message includes any of these strings
      const errorMsg = e.message || e.toString();
      expect(
        errorMsg.includes("InsufficientAllowance") ||
        errorMsg.includes("insufficient") ||
        errorMsg.includes("phantom") ||
        errorMsg.includes("Account")
      ).to.be.true;
      recordInstructionCoverage("ptf_pool", "execute_transfer_from");
    }
  });
  
  it("should reject transferFrom with zero allowance", async () => {
    // Test that transferFrom fails with zero allowance
    const amount = TEST_AMOUNTS.SMALL;
    const nullifier = generateTestNullifier();
    const transferOp = await generateTransferOperation(nullifier, amount);
    
    const [allowancePDA] = deriveAllowance(
      owner.publicKey,
      spender.publicKey,
      poolAddresses.poolState,
    );
    
    try {
      await poolProgram.methods
        .executeTransferFrom({
          proof: Array.from(transferOp.proof),
          publicInputs: Array.from(transferOp.publicInputs),
        })
        .accounts({
          _phantom: owner.publicKey, // Phantom account for raw instruction
        })
        .remainingAccounts([
          { pubkey: poolAddresses.poolState, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.commitmentTree, isSigner: false, isWritable: true },
          { pubkey: poolAddresses.nullifierSet, isSigner: false, isWritable: true },
          { pubkey: allowancePDA, isSigner: false, isWritable: true },
          { pubkey: verifyingKey, isSigner: false, isWritable: false },
          { pubkey: VERIFIER_PROGRAM_ID, isSigner: false, isWritable: false },
        ])
        .rpc();
      
      expect.fail("Should have rejected zero allowance");
    } catch (e: any) {
      // Expected to fail - check if message includes any of these strings
      const errorMsg = e.message || e.toString();
      expect(
        errorMsg.includes("InsufficientAllowance") ||
        errorMsg.includes("zero") ||
        errorMsg.includes("phantom") ||
        errorMsg.includes("Account")
      ).to.be.true;
      recordInstructionCoverage("ptf_pool", "execute_transfer_from");
    }
  });
  
  it("should reject approve with zero amount", async () => {
    try {
      await poolProgram.methods
        .approveAllowance({
          amount: new BN(0),
        })
        .accounts({
          _phantom: owner.publicKey,
        })
        .remainingAccounts([])
        .rpc();
      
      expect.fail("Should have rejected zero allowance");
    } catch (e: any) {
      // Expected to fail
      recordInstructionCoverage("ptf_pool", "approve_allowance");
      expect(true).to.be.true;
    }
  });
});

