import {
  Connection,
  PublicKey,
  AccountInfo,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getAccount,
  Mint,
  Account as TokenAccount,
} from "@solana/spl-token";
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
    const accountName = Object.keys(program.account)[0];
    const account = await (program.account as any)[accountName].fetch(address);
    return account as T;
  } catch (e) {
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Derive a PDA (Program Derived Address)
 */
export function derivePDA(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Get or create associated token account address
 */
export function getATAAddress(
  mint: PublicKey,
  owner: PublicKey,
): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner);
}

/**
 * Create associated token account instruction if needed
 */
export async function createATAIfNeeded(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
): Promise<{ address: PublicKey; instruction: any | null }> {
  const ata = getATAAddress(mint, owner);
  
  const accountInfo = await connection.getAccountInfo(ata);
  if (accountInfo) {
    return { address: ata, instruction: null };
  }
  
  const instruction = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
  );
  
  return { address: ata, instruction };
}

/**
 * Get token account balance
 */
export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey,
): Promise<bigint> {
  try {
    const account = await getAccount(connection, tokenAccount);
    return account.amount;
  } catch (e) {
    return BigInt(0);
  }
}

/**
 * Get mint info
 */
export async function getMintInfo(
  connection: Connection,
  mint: PublicKey,
): Promise<Mint | null> {
  try {
    return await getMint(connection, mint);
  } catch (e) {
    return null;
  }
}

/**
 * Get token account info
 */
export async function getTokenAccountInfo(
  connection: Connection,
  tokenAccount: PublicKey,
): Promise<TokenAccount | null> {
  try {
    return await getAccount(connection, tokenAccount);
  } catch (e) {
    return null;
  }
}

/**
 * Wait for account to exist
 */
export async function waitForAccount(
  connection: Connection,
  address: PublicKey,
  timeout: number = 10000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await accountExists(connection, address)) {
      return true;
    }
    await sleep(100);
  }
  return false;
}

