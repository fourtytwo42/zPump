import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { POOL_PROGRAM_ID } from "@/lib/solana/programs";
import idl from "../../app/idl/ptf_pool.json";

export interface ShieldParams {
  amount: number;
  commitment: Uint8Array;
  mint: PublicKey;
}

export async function buildShieldTransaction(
  connection: Connection,
  wallet: Wallet,
  params: ShieldParams
): Promise<Transaction> {
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program(idl as any, provider);

  // Generate proof via API
  const proofResponse = await fetch("/api/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation: "shield",
      amount: params.amount,
      commitment: Array.from(params.commitment),
    }),
  });

  if (!proofResponse.ok) {
    throw new Error("Failed to generate proof");
  }

  const { proof, public_inputs } = await proofResponse.json();

  // Build prepare shield transaction
  const tx = await program.methods
    .prepareShield({
      amount: params.amount,
      commitment: Array.from(params.commitment),
    })
    .accounts({
      payer: wallet.publicKey,
      proofVault: PublicKey.findProgramAddressSync(
        [Buffer.from("proof-vault"), wallet.publicKey.toBuffer()],
        POOL_PROGRAM_ID
      )[0],
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return tx;
}

