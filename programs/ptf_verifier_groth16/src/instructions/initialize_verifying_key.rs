use anchor_lang::prelude::*;
use crate::state::VerifyingKeyAccount;
use crate::errors::VerifierError;

pub fn initialize_verifying_key(
    ctx: Context<InitializeVerifyingKey>,
    circuit_tag: [u8; 32],
    version: u32,
    key_data: Vec<u8>,
) -> Result<()> {
    let verifying_key = &mut ctx.accounts.verifying_key;
    
    // The init constraint ensures the account is new, so we don't need to check
    // Just initialize the fields
    
    verifying_key.circuit_tag = circuit_tag;
    verifying_key.version = version;
    verifying_key.key_data = key_data;
    verifying_key.revoked = false;
    verifying_key.authority = ctx.accounts.authority.key();
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(circuit_tag: [u8; 32], version: u32, key_data: Vec<u8>)]
pub struct InitializeVerifyingKey<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + 4 + key_data.len() + 1 + 32,
        seeds = [b"verifying-key", circuit_tag.as_ref(), &version.to_le_bytes()],
        bump
    )]
    pub verifying_key: Account<'info, VerifyingKeyAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

