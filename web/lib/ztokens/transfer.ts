import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { POOL_PROGRAM_ID } from "@/lib/solana/programs";
import idl from "../../app/idl/ptf_pool.json";

export interface TransferParams {
  nullifier: Uint8Array;
  amount: number;
  recipient: PublicKey;
  mint: PublicKey;
}

export async function buildTransferTransaction(
  connection: Connection,
  wallet: Wallet,
  params: TransferParams
): Promise<Transaction> {
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program(idl as any, provider);

  // Generate proof via API
  const proofResponse = await fetch("/api/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation: "transfer",
      nullifier: Array.from(params.nullifier),
      amount: params.amount,
      recipient: params.recipient.toBase58(),
    }),
  });

  if (!proofResponse.ok) {
    throw new Error("Failed to generate proof");
  }

  const { proof, public_inputs } = await proofResponse.json();

  // Build transfer transaction
  const tx = await program.methods
    .executeTransfer({
      proof: Array.from(proof),
      publicInputs: Array.from(public_inputs),
    })
    .accounts({
      _phantom: wallet.publicKey,
    })
    .remainingAccounts([
      // TODO: Add pool state, commitment tree, nullifier set, verifying key, verifier program
    ])
    .transaction();

  return tx;
}

