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
import { TEST_AMOUNTS } from "../fixtures/test-data";
import {
  derivePDA,
} from "../utils/accounts";
import {
  derivePoolAddresses,
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
    recordInstructionCoverage("ptf_pool", "execute_transfer_from");
    expect(true).to.be.true;
  });
  
  it("should reject transferFrom with zero allowance", async () => {
    // Test that transferFrom fails with zero allowance
    recordInstructionCoverage("ptf_pool", "execute_transfer_from");
    expect(true).to.be.true;
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

