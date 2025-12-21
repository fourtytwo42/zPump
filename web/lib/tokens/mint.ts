import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  createMint,
  mintTo,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";

export interface CreateTokenParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  token2022?: boolean;
}

export async function buildCreateTokenTransaction(
  connection: Connection,
  payer: PublicKey,
  params: CreateTokenParams
): Promise<{ transaction: Transaction; mint: Keypair }> {
  const mint = Keypair.generate();

  // Create mint instruction
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: 82, // Mint account size
      lamports: await connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // TODO: Add initialize mint instruction
  // TODO: Add mint to payer instruction if initialSupply > 0

  return { transaction, mint };
}

export async function buildMintToTransaction(
  connection: Connection,
  mint: PublicKey,
  amount: number,
  recipient: PublicKey,
  authority: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction();

  // Get or create recipient token account
  const recipientATA = await getAssociatedTokenAddress(mint, recipient);
  const recipientAccount = await connection.getAccountInfo(recipientATA);

  if (!recipientAccount) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        authority,
        recipientATA,
        recipient,
        mint
      )
    );
  }

  // Get mint info for decimals
  const mintInfo = await getMint(connection, mint);

  // TODO: Add mintTo instruction
  // transaction.add(
  //   createMintToInstruction(
  //     mint,
  //     recipientATA,
  //     authority,
  //     amount * Math.pow(10, mintInfo.decimals)
  //   )
  // );

  return transaction;
}

