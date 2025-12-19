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
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";

export async function createTestToken(
  connection: Connection,
  payer: Keypair,
  decimals: number = 9,
  initialSupply: number = 1000000,
): Promise<PublicKey> {
  console.log("Creating test token...");
  
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
      decimals,
      payer.publicKey,
      null,
    ),
  );
  
  await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
  
  // Create associated token account
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
  
  // Mint initial supply
  const mintAmount = initialSupply * Math.pow(10, decimals);
  const mintTx = new Transaction().add(
    createMintToInstruction(
      mintKeypair.publicKey,
      ata,
      payer.publicKey,
      mintAmount,
    ),
  );
  
  await sendAndConfirmTransaction(connection, mintTx, [payer]);
  
  console.log("Test token created:", mintKeypair.publicKey.toString());
  console.log("Token ATA:", ata.toString());
  
  return mintKeypair.publicKey;
}

if (require.main === module) {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const payer = Keypair.fromSecretKey(
    new Uint8Array(64).fill(0), // Placeholder
  );
  
  createTestToken(connection, payer)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

