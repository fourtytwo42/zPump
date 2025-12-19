import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";

export const RPC_URL = process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899";
export const COMMITMENT = "confirmed";

let connection: Connection | null = null;
let provider: AnchorProvider | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, COMMITMENT);
  }
  return connection;
}

export function getProvider(payer: Keypair): AnchorProvider {
  if (!provider) {
    const wallet = new Wallet(payer);
    provider = new AnchorProvider(
      getConnection(),
      wallet,
      { commitment: COMMITMENT },
    );
  }
  return provider;
}

export async function airdropSol(
  connection: Connection,
  pubkey: PublicKey,
  amount: number = 10,
): Promise<string> {
  const signature = await connection.requestAirdrop(
    pubkey,
    amount * anchor.web3.LAMPORTS_PER_SOL,
  );
  await connection.confirmTransaction(signature, COMMITMENT);
  return signature;
}

export async function waitForSlot(connection: Connection, targetSlot: number): Promise<void> {
  while (true) {
    const slot = await connection.getSlot();
    if (slot >= targetSlot) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

