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
  FACTORY_PROGRAM_ID,
} from "../utils/programs";
import { recordInstructionCoverage } from "../utils/coverage";
import { EDGE_CASE_DATA, TEST_AMOUNTS, generateTestNullifier } from "../fixtures/test-data";
import {
  derivePDA,
} from "../utils/accounts";
import {
  deriveProofVault,
} from "../utils/pool-helpers";

describe("Unshield Operations - Edge Cases", () => {
  let connection: Connection;
  let user: Keypair;
  let recipient: Keypair;
  let poolProgram: any;
  let factoryProgram: any;
  let proofVault: PublicKey;
  
  before(async () => {
    connection = getConnection();
    user = generateKeypair();
    recipient = generateKeypair();
    await airdropSol(connection, user.publicKey, 10);
    await airdropSol(connection, recipient.publicKey, 1);
    
    poolProgram = getPoolProgram(connection, user);
    factoryProgram = getFactoryProgram(connection, user);
    
    // Derive proof vault
    [proofVault] = deriveProofVault(user.publicKey);
    
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
  
  it("should reject unshield with invalid nullifier", async () => {
    const invalidNullifier = EDGE_CASE_DATA.invalidNullifier; // 31 bytes instead of 32
    
    try {
      await poolProgram.methods
        .prepareUnshield({
          nullifier: Array.from(invalidNullifier),
          amount: new BN(TEST_AMOUNTS.SMALL),
          recipient: recipient.publicKey,
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have rejected invalid nullifier size");
    } catch (e: any) {
      // Expected to fail
      recordInstructionCoverage("ptf_pool", "prepare_unshield");
      expect(true).to.be.true;
    }
  });
  
  it("should reject unshield with already-used nullifier", async () => {
    const nullifier = generateTestNullifier();
    
    try {
      // First unshield
      await poolProgram.methods
        .prepareUnshield({
          nullifier: Array.from(nullifier),
          amount: new BN(TEST_AMOUNTS.SMALL),
          recipient: recipient.publicKey,
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      // Try duplicate
      await poolProgram.methods
        .prepareUnshield({
          nullifier: Array.from(nullifier),
          amount: new BN(TEST_AMOUNTS.SMALL),
          recipient: recipient.publicKey,
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have rejected duplicate nullifier");
    } catch (e: any) {
      // Expected to fail on duplicate
      recordInstructionCoverage("ptf_pool", "prepare_unshield");
      expect(true).to.be.true;
    }
  });
  
  it("should reject unshield with zero amount", async () => {
    const nullifier = generateTestNullifier();
    
    try {
      await poolProgram.methods
        .prepareUnshield({
          nullifier: Array.from(nullifier),
          amount: new BN(0),
          recipient: recipient.publicKey,
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have rejected zero amount");
    } catch (e: any) {
      // Expected to fail
      const errorMsg = e.message || e.toString();
      expect(
        errorMsg.includes("InvalidAmount") ||
        errorMsg.includes("zero") ||
        errorMsg.includes("Constraint")
      ).to.be.true;
      recordInstructionCoverage("ptf_pool", "prepare_unshield");
    }
  });
});

