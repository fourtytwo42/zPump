import { PublicKey } from "@solana/web3.js";

// Program IDs - Update these to match your deployed programs
export const POOL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_POOL_PROGRAM_ID ||
    "6MLrNAydScBBWq6vFXPLjahvxjF1PzauuSYTuLS7yfYC"
);

export const FACTORY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_FACTORY_PROGRAM_ID ||
    "4NHiLQJwmgQW9hGrxeAPESXLvgMgEdBfRdAa3Wxiyf8u"
);

export const VAULT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID ||
    "ArUznHH2tESKsknoiW3HhURY46MzXyJL55HuGdKUXQEy"
);

export const VERIFIER_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VERIFIER_PROGRAM_ID ||
    "DBGY7sSPJ8434jxU1a5qS24JDCYhmxZfAMfe1fumkvSZ"
);

