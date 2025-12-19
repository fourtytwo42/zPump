use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::VaultState;
use crate::errors::VaultError;

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;
    
    // Verify authority (only pool program can deposit)
    require!(
        ctx.accounts.authority.key() == vault.authority,
        VaultError::InvalidAuthority
    );
    
    // Verify mint matches
    require!(
        ctx.accounts.user_token_account.mint == vault.origin_mint,
        VaultError::InvalidMint
    );
    
    // Transfer tokens from user to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        seeds = [b"vault", vault.origin_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultState>,
    
    /// CHECK: Authority that can deposit (pool program)
    pub authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub user_authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

