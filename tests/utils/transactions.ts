import {
  Connection,
  Keypair,
  Transaction,
  TransactionSignature,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

export async function sendTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
): Promise<TransactionSignature> {
  return await sendAndConfirmTransaction(
    connection,
    transaction,
    signers,
    { commitment: "confirmed" },
  );
}

export async function getTransactionLogs(
  connection: Connection,
  signature: TransactionSignature,
): Promise<string[]> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  return tx?.meta?.logMessages || [];
}

export async function verifyTransactionSuccess(
  connection: Connection,
  signature: TransactionSignature,
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  return tx?.meta?.err === null;
}

export async function getComputeUnitsUsed(
  connection: Connection,
  signature: TransactionSignature,
): Promise<number> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  return tx?.meta?.computeUnitsConsumed || 0;
}

