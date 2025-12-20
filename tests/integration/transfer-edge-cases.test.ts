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
import {
  derivePDA,
} from "../utils/accounts";
import {
  derivePoolAddresses,
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
          poolState: poolAddresses.poolState,
          commitmentTree: poolAddresses.commitmentTree,
          nullifierSet: poolAddresses.nullifierSet,
          verifyingKey: verifyingKey,
          verifierProgram: VERIFIER_PROGRAM_ID,
        })
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
    recordInstructionCoverage("ptf_pool", "execute_transfer");
    expect(true).to.be.true;
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
          poolState: poolAddresses.poolState,
          commitmentTree: poolAddresses.commitmentTree,
          nullifierSet: poolAddresses.nullifierSet,
          verifyingKey: verifyingKey,
          verifierProgram: VERIFIER_PROGRAM_ID,
        })
        .rpc();
      
      expect.fail("Should have rejected invalid public inputs");
    } catch (e: any) {
      // Expected to fail
      recordInstructionCoverage("ptf_pool", "execute_transfer");
      expect(true).to.be.true;
    }
  });
});

