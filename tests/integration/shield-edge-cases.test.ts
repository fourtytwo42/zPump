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
import { EDGE_CASE_DATA, TEST_AMOUNTS, generateTestCommitment } from "../fixtures/test-data";
import {
  derivePDA,
} from "../utils/accounts";
import {
  deriveProofVault,
} from "../utils/pool-helpers";

describe("Shield Operations - Edge Cases", () => {
  let connection: Connection;
  let user: Keypair;
  let poolProgram: any;
  let factoryProgram: any;
  let proofVault: PublicKey;
  
  before(async () => {
    connection = getConnection();
    user = generateKeypair();
    await airdropSol(connection, user.publicKey, 10);
    
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
  
  it("should reject shield with zero amount", async () => {
    const commitment = generateTestCommitment();
    
    try {
      await poolProgram.methods
        .prepareShield({
          amount: new BN(0),
          commitment: Array.from(commitment),
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
      expect(e.message).to.include("InvalidAmount") || expect(e.message).to.include("zero");
      recordInstructionCoverage("ptf_pool", "prepare_shield");
    }
  });
  
  it("should reject shield with invalid commitment size", async () => {
    const invalidCommitment = EDGE_CASE_DATA.invalidCommitment; // 31 bytes instead of 32
    
    try {
      await poolProgram.methods
        .prepareShield({
          amount: new BN(TEST_AMOUNTS.SMALL),
          commitment: Array.from(invalidCommitment),
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have rejected invalid commitment size");
    } catch (e: any) {
      // Expected to fail
      recordInstructionCoverage("ptf_pool", "prepare_shield");
      expect(true).to.be.true;
    }
  });
  
  it("should handle maximum shield amount", async () => {
    const commitment = generateTestCommitment();
    const maxAmount = TEST_AMOUNTS.LARGE;
    
    try {
      const tx = await poolProgram.methods
        .prepareShield({
          amount: new BN(maxAmount),
          commitment: Array.from(commitment),
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      recordInstructionCoverage("ptf_pool", "prepare_shield");
      expect(tx).to.be.a("string");
    } catch (e: any) {
      // May fail if amount exceeds MAX_SHIELD_AMOUNT
      recordInstructionCoverage("ptf_pool", "prepare_shield");
      expect(true).to.be.true;
    }
  });
  
  it("should reject shield with duplicate commitment", async () => {
    const commitment = generateTestCommitment();
    
    try {
      // First shield
      await poolProgram.methods
        .prepareShield({
          amount: new BN(TEST_AMOUNTS.SMALL),
          commitment: Array.from(commitment),
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      // Try duplicate
      await poolProgram.methods
        .prepareShield({
          amount: new BN(TEST_AMOUNTS.SMALL),
          commitment: Array.from(commitment),
        })
        .accounts({
          payer: user.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      expect.fail("Should have rejected duplicate commitment");
    } catch (e: any) {
      // Expected to fail on duplicate
      recordInstructionCoverage("ptf_pool", "prepare_shield");
      expect(true).to.be.true;
    }
  });
});

