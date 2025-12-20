use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("DBGY7sSPJ8434jxU1a5qS24JDCYhmxZfAMfe1fumkvSZ");

#[program]
pub mod ptf_verifier_groth16 {
    use super::*;

    pub fn initialize_verifying_key(
        ctx: Context<InitializeVerifyingKey>,
        circuit_tag: [u8; 32],
        version: u32,
        key_data: Vec<u8>,
    ) -> Result<()> {
        instructions::initialize_verifying_key(ctx, circuit_tag, version, key_data)
    }

    pub fn verify_groth16(
        ctx: Context<VerifyGroth16>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<()> {
        instructions::verify_groth16(ctx, proof, public_inputs)
    }
}

