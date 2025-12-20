import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as ptfFactory from "../target/idl/ptf_factory.json";
import * as ptfVerifier from "../target/idl/ptf_verifier_groth16.json";
import { bootstrapWSOL } from "./bootstrap-wsol";

const FACTORY_PROGRAM_ID = new PublicKey("AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg");
const VERIFIER_PROGRAM_ID = new PublicKey("DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE");

export async function bootstrapPrivateDevnet(
  connection: Connection,
  payer: Keypair,
) {
  console.log("Bootstrapping private devnet environment...");
  
  // Bootstrap wSOL
  const wsolMint = await bootstrapWSOL(connection, payer);
  
  // Initialize factory
  const provider = new AnchorProvider(
    connection,
    new Wallet(payer),
    { commitment: "confirmed" },
  );
  
  const factoryProgram = new Program(
    ptfFactory as any,
    FACTORY_PROGRAM_ID,
    provider,
  );
  
  // Initialize factory
  const [factoryState] = PublicKey.findProgramAddressSync(
    [Buffer.from("factory")],
    FACTORY_PROGRAM_ID,
  );
  
  try {
    await factoryProgram.methods
      .initializeFactory()
      .accounts({
        factory: factoryState,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("Factory initialized:", factoryState.toString());
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("Factory already initialized");
    } else {
      throw e;
    }
  }
  
  // Create test token mint
  const testMint = Keypair.generate();
  const mintLamports = await getMinimumBalanceForRentExemptMint(connection);
  
  const createMintTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: testMint.publicKey,
      space: MINT_SIZE,
      lamports: mintLamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      testMint.publicKey,
      9,
      payer.publicKey,
      null,
    ),
  );
  
  await sendAndConfirmTransaction(connection, createMintTx, [payer, testMint]);
  console.log("Test token mint created:", testMint.publicKey.toString());
  
  // Register mint in factory
  const [mintMapping] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-mapping"), testMint.publicKey.toBuffer()],
    FACTORY_PROGRAM_ID,
  );
  
  // Note: Pool address would be derived, but we'll create a placeholder for now
  const poolAddress = Keypair.generate().publicKey;
  
  try {
    await factoryProgram.methods
      .registerMint(testMint.publicKey, poolAddress)
      .accounts({
        factory: factoryState,
        mintMapping,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("Mint registered:", testMint.publicKey.toString());
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("Mint already registered");
    } else {
      throw e;
    }
  }
  
  // Create verifying key (placeholder)
  const verifierProgram = new Program(
    ptfVerifier as any,
    VERIFIER_PROGRAM_ID,
    provider,
  );
  
  const circuitTag = Buffer.alloc(32, 0);
  const version = 1;
  const keyData = Buffer.alloc(100, 0); // Placeholder key data
  
  const [verifyingKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("verifying-key"),
      circuitTag,
      Buffer.from(version.toString()),
    ],
    VERIFIER_PROGRAM_ID,
  );
  
  try {
    await factoryProgram.methods
      .createVerifyingKey(Array.from(circuitTag), version, Array.from(keyData))
      .accounts({
        factory: factoryState,
        verifyingKey,
        authority: payer.publicKey,
        verifierProgram: VERIFIER_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("Verifying key created:", verifyingKey.toString());
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("Verifying key already created");
    } else {
      throw e;
    }
  }
  
  console.log("Private devnet bootstrapped successfully!");
  console.log("wSOL mint:", wsolMint.toString());
  console.log("Test token mint:", testMint.publicKey.toString());
  console.log("Factory state:", factoryState.toString());
}

if (require.main === module) {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  
  // Generate a payer keypair for testing
  const payer = Keypair.generate();
  
  // Airdrop SOL to payer
  connection.requestAirdrop(payer.publicKey, 10 * 1e9)
    .then((sig) => connection.confirmTransaction(sig))
    .then(() => bootstrapPrivateDevnet(connection, payer))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

