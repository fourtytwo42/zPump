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

const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

export async function bootstrapWSOL(
  connection: Connection,
  payer: Keypair,
): Promise<PublicKey> {
  console.log("Bootstrapping wSOL...");
  
  // Check if wSOL mint already exists
  try {
    const mintInfo = await connection.getAccountInfo(WSOL_MINT);
    if (mintInfo) {
      console.log("wSOL mint already exists");
      return WSOL_MINT;
    }
  } catch (e) {
    // Mint doesn't exist, we'll create it
  }
  
  // Create wSOL mint account
  const mintKeypair = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      9, // decimals
      payer.publicKey, // mint authority
      null, // freeze authority
    ),
  );
  
  await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
  
  console.log("wSOL mint created:", mintKeypair.publicKey.toString());
  
  // Create associated token account for payer
  const ata = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    payer.publicKey,
  );
  
  const createAtaTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      payer.publicKey,
      mintKeypair.publicKey,
    ),
  );
  
  await sendAndConfirmTransaction(connection, createAtaTx, [payer]);
  
  // Mint some wSOL to payer
  const mintAmount = 1000 * 1e9; // 1000 SOL worth
  const mintTx = new Transaction().add(
    createMintToInstruction(
      mintKeypair.publicKey,
      ata,
      payer.publicKey,
      mintAmount,
    ),
  );
  
  await sendAndConfirmTransaction(connection, mintTx, [payer]);
  
  console.log("wSOL bootstrapped successfully");
  console.log("wSOL mint:", mintKeypair.publicKey.toString());
  console.log("wSOL ATA:", ata.toString());
  
  return mintKeypair.publicKey;
}

if (require.main === module) {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const payer = Keypair.fromSecretKey(
    // Load from file or generate
    new Uint8Array(64).fill(0), // Placeholder
  );
  
  bootstrapWSOL(connection, payer)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

