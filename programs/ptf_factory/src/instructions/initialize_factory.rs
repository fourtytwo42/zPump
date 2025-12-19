use anchor_lang::prelude::*;
use crate::state::FactoryState;
use crate::errors::FactoryError;

pub fn initialize_factory(ctx: Context<InitializeFactory>) -> Result<()> {
    let factory = &mut ctx.accounts.factory;
    
    // The init constraint ensures the account is new, so we don't need to check data_len
    factory.authority = ctx.accounts.authority.key();
    factory.bump = ctx.bumps.factory;
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeFactory<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + FactoryState::LEN,
        seeds = [b"factory"],
        bump
    )]
    pub factory: Account<'info, FactoryState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

