import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import * as ptfFactoryIdl from "../../target/idl/ptf_factory.json";
import * as ptfVaultIdl from "../../target/idl/ptf_vault.json";
import * as ptfVerifierIdl from "../../target/idl/ptf_verifier_groth16.json";
import * as ptfPoolIdl from "../../target/idl/ptf_pool.json";

// Program IDs from Anchor.toml
export const FACTORY_PROGRAM_ID = new PublicKey("AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg");
export const VAULT_PROGRAM_ID = new PublicKey("iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw");
export const VERIFIER_PROGRAM_ID = new PublicKey("DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE");
export const POOL_PROGRAM_ID = new PublicKey("9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku");

export function getFactoryProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const provider = new AnchorProvider(
    connection,
    new Wallet(payer),
    { commitment: "confirmed" },
  );
  return new Program(
    ptfFactoryIdl as Idl,
    FACTORY_PROGRAM_ID,
    provider,
  );
}

export function getVaultProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const provider = new AnchorProvider(
    connection,
    new Wallet(payer),
    { commitment: "confirmed" },
  );
  return new Program(
    ptfVaultIdl as Idl,
    VAULT_PROGRAM_ID,
    provider,
  );
}

export function getVerifierProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const provider = new AnchorProvider(
    connection,
    new Wallet(payer),
    { commitment: "confirmed" },
  );
  return new Program(
    ptfVerifierIdl as Idl,
    VERIFIER_PROGRAM_ID,
    provider,
  );
}

export function getPoolProgram(
  connection: Connection,
  payer: Keypair,
): Program {
  const provider = new AnchorProvider(
    connection,
    new Wallet(payer),
    { commitment: "confirmed" },
  );
  return new Program(
    ptfPoolIdl as Idl,
    POOL_PROGRAM_ID,
    provider,
  );
}

