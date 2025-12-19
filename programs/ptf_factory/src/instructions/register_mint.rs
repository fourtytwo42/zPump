use anchor_lang::prelude::*;
use crate::state::{FactoryState, MintMapping};
use crate::errors::FactoryError;

pub fn register_mint(
    ctx: Context<RegisterMint>,
    origin_mint: Pubkey,
    pool: Pubkey,
) -> Result<()> {
    let factory = &ctx.accounts.factory;
    let mint_mapping = &mut ctx.accounts.mint_mapping;
    
    // Verify authority
    require!(
        factory.authority == ctx.accounts.authority.key(),
        FactoryError::InvalidAuthority
    );
    
    // The init constraint ensures the account is new, so we don't need to check
    // Just initialize the fields
    
    mint_mapping.origin_mint = origin_mint;
    mint_mapping.pool = pool;
    mint_mapping.twin_mint = None;
    mint_mapping.bump = ctx.bumps.mint_mapping;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(origin_mint: Pubkey)]
pub struct RegisterMint<'info> {
    #[account(
        seeds = [b"factory"],
        bump = factory.bump
    )]
    pub factory: Account<'info, FactoryState>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + MintMapping::LEN,
        seeds = [b"mint-mapping", origin_mint.as_ref()],
        bump
    )]
    pub mint_mapping: Account<'info, MintMapping>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

