import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import { POOL_PROGRAM_ID, VERIFIER_PROGRAM_ID } from "@/lib/solana/programs";

let idlCache: Idl | null = null;
async function getIdl(): Promise<Idl> {
  if (!idlCache) {
    const idlModule = await import("../../app/idl/ptf_pool.json");
    idlCache = idlModule.default as Idl;
  }
  return idlCache;
}

export interface UnshieldParams {
  nullifier: Uint8Array;
  amount: number;
  recipient: PublicKey;
  mint: PublicKey;
}

export async function buildUnshieldTransactions(
  connection: Connection,
  wallet: Wallet,
  params: UnshieldParams
): Promise<Transaction[]> {
  const provider = new AnchorProvider(connection, wallet, {});
  const idl = await getIdl();
  const program = new Program(idl, provider);

  const transactions: Transaction[] = [];

  // Step 1: Prepare unshield
  const prepareTx = await program.methods
    .prepareUnshield({
      nullifier: Array.from(params.nullifier),
      amount: params.amount,
      recipient: params.recipient,
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

  transactions.push(prepareTx);

  // Step 2: Generate proof and attestation
  const proofResponse = await fetch("/api/proof", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation: "unshield",
      nullifier: Array.from(params.nullifier),
      amount: params.amount,
      recipient: params.recipient.toBase58(),
    }),
  });

  if (!proofResponse.ok) {
    throw new Error("Failed to generate proof");
  }

  const { proof, public_inputs } = await proofResponse.json();

  // Get attestation
  const verifierResponse = await fetch("/api/verifier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      proof,
      publicInputs: public_inputs,
      verifyingKey: "", // TODO: Get verifying key
    }),
  });

  if (!verifierResponse.ok) {
    throw new Error("Failed to verify proof");
  }

  const { attestation } = await verifierResponse.json();

  // Step 3: Update operation data
  const updateTx = await program.methods
    .updateOperationData(
      new Uint8Array(32), // TODO: Get operation ID from prepare
      new Uint8Array(0) // TODO: Serialize proof + attestation + public_inputs
    )
    .accounts({
      payer: wallet.publicKey,
      proofVault: PublicKey.findProgramAddressSync(
        [Buffer.from("proof-vault"), wallet.publicKey.toBuffer()],
        POOL_PROGRAM_ID
      )[0],
    })
    .transaction();

  transactions.push(updateTx);

  // Step 4: Execute unshield verify
  const verifyTx = await program.methods
    .executeUnshieldVerify(new Uint8Array(32)) // TODO: Get operation ID
    .accounts({
      proofVault: PublicKey.findProgramAddressSync(
        [Buffer.from("proof-vault"), wallet.publicKey.toBuffer()],
        POOL_PROGRAM_ID
      )[0],
      verifyingKey: PublicKey.default, // TODO: Get verifying key
      externalVerifier: PublicKey.default, // TODO: Get external verifier pubkey
      verifierProgram: VERIFIER_PROGRAM_ID,
    })
    .transaction();

  transactions.push(verifyTx);

  return transactions;
}

