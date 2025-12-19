use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg");

#[program]
pub mod ptf_factory {
    use super::*;

    pub fn initialize_factory(ctx: Context<InitializeFactory>) -> Result<()> {
        instructions::initialize_factory(ctx)
    }

    pub fn register_mint(
        ctx: Context<RegisterMint>,
        origin_mint: Pubkey,
        pool: Pubkey,
    ) -> Result<()> {
        instructions::register_mint(ctx, origin_mint, pool)
    }

    pub fn create_verifying_key(
        ctx: Context<CreateVerifyingKey>,
        circuit_tag: [u8; 32],
        version: u32,
        key_data: Vec<u8>,
    ) -> Result<()> {
        instructions::create_verifying_key(ctx, circuit_tag, version, key_data)
    }
}

