import {
  Connection,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

export async function getAccountInfo(
  connection: Connection,
  address: PublicKey,
): Promise<AccountInfo<Buffer> | null> {
  return await connection.getAccountInfo(address);
}

export async function accountExists(
  connection: Connection,
  address: PublicKey,
): Promise<boolean> {
  const account = await getAccountInfo(connection, address);
  return account !== null;
}

export async function getAccountData<T>(
  program: Program,
  address: PublicKey,
): Promise<T | null> {
  try {
    const account = await program.account[Object.keys(program.account)[0]].fetch(address);
    return account as T;
  } catch (e) {
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

