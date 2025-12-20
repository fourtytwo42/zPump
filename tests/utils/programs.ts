import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import * as ptfFactoryIdl from "../../target/idl/ptf_factory.json";
import * as ptfVaultIdl from "../../target/idl/ptf_vault.json";
import * as ptfVerifierIdl from "../../target/idl/ptf_verifier_groth16.json";
import * as ptfPoolIdl from "../../target/idl/ptf_pool.json";

// Program IDs from Anchor.toml (synced with anchor keys sync)
export const FACTORY_PROGRAM_ID = new PublicKey("4NHiLQJwmgQW9hGrxeAPESXLvgMgEdBfRdAa3Wxiyf8u");
export const VAULT_PROGRAM_ID = new PublicKey("ArUznHH2tESKsknoiW3HhURY46MzXyJL55HuGdKUXQEy");
export const VERIFIER_PROGRAM_ID = new PublicKey("DBGY7sSPJ8434jxU1a5qS24JDCYhmxZfAMfe1fumkvSZ");
export const POOL_PROGRAM_ID = new PublicKey("6MLrNAydScBBWq6vFXPLjahvxjF1PzauuSYTuLS7yfYC");

export function getFactoryProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" },
  );
  return new Program(
    ptfFactoryIdl as Idl,
    provider,
  ) as Program;
}

export function getVaultProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" },
  );
  return new Program(
    ptfVaultIdl as Idl,
    provider,
  ) as Program;
}

export function getVerifierProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" },
  );
  return new Program(
    ptfVerifierIdl as Idl,
    provider,
  ) as Program;
}

export function getPoolProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" },
  );
  return new Program(
    ptfPoolIdl as Idl,
    provider,
  ) as Program;
}

