use anchor_lang::prelude::*;
use crate::state::FactoryState;
use crate::errors::FactoryError;
use ptf_verifier_groth16;

pub fn create_verifying_key(
    ctx: Context<CreateVerifyingKey>,
    circuit_tag: [u8; 32],
    version: u32,
    key_data: Vec<u8>,
) -> Result<()> {
    let factory = &ctx.accounts.factory;
    
    // Verify authority
    require!(
        factory.authority == ctx.accounts.authority.key(),
        FactoryError::InvalidAuthority
    );
    
    // CPI to verifier program to initialize verifying key
    let cpi_program = ctx.accounts.verifier_program.to_account_info();
    let cpi_accounts = ptf_verifier_groth16::cpi::accounts::InitializeVerifyingKey {
        verifying_key: ctx.accounts.verifying_key.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    ptf_verifier_groth16::cpi::initialize_verifying_key(cpi_ctx, circuit_tag, version, key_data)?;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(circuit_tag: [u8; 32], version: u32, key_data: Vec<u8>)]
pub struct CreateVerifyingKey<'info> {
    #[account(
        seeds = [b"factory"],
        bump = factory.bump
    )]
    pub factory: Account<'info, FactoryState>,
    
    /// CHECK: Verifying key account (created by verifier program)
    #[account(mut)]
    pub verifying_key: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub verifier_program: Program<'info, ptf_verifier_groth16::program::PtfVerifierGroth16>,
    
    pub system_program: Program<'info, System>,
}

