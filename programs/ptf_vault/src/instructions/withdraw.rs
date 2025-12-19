use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::VaultState;
use crate::errors::VaultError;

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;
    
    // Verify authority (only pool program can withdraw)
    require!(
        ctx.accounts.authority.key() == vault.authority,
        VaultError::InvalidAuthority
    );
    
    // Verify mint matches
    require!(
        ctx.accounts.vault_token_account.mint == vault.origin_mint,
        VaultError::InvalidMint
    );
    
    // Verify vault token account matches
    require!(
        ctx.accounts.vault_token_account.key() == vault.vault_token_account,
        VaultError::TokenAccountMismatch
    );
    
    // Check sufficient balance
    require!(
        ctx.accounts.vault_token_account.amount >= amount,
        VaultError::InsufficientBalance
    );
    
    // Transfer tokens from vault to user
    let seeds = &[
        b"vault",
        vault.origin_mint.as_ref(),
        &[vault.bump],
    ];
    let signer = &[&seeds[..]];
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        seeds = [b"vault", vault.origin_mint.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultState>,
    
    /// CHECK: Authority that can withdraw (pool program)
    pub authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

