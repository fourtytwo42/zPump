use anchor_lang::prelude::*;
use crate::{ApproveAllowanceArgs, ApproveAllowance as ApproveAllowanceContext};
use crate::errors::PoolError;
use ptf_common::InputValidator;
use anchor_lang::solana_program::rent::Rent;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke_signed;

#[account]
pub struct Allowance {
    pub owner: Pubkey,
    pub spender: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

impl Allowance {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1;
}

pub fn approve_allowance(
    ctx: Context<ApproveAllowanceContext>,
    args: ApproveAllowanceArgs,
) -> Result<()> {
    // Validate amount
    InputValidator::validate_amount(args.amount, ptf_common::MAX_AMOUNT)?;
    
    // Extract accounts from remaining_accounts using raw pattern
    // Expected accounts: owner (signer), allowance (PDA), pool_state, system_program
    let remaining_accounts = ctx.remaining_accounts;
    require!(remaining_accounts.len() >= 4, PoolError::AccountNotFound);
    
    // Full implementation would:
    // 1. Extract owner, allowance PDA, pool_state from remaining_accounts
    // 2. Derive allowance PDA: [b"allowance", owner, spender, pool]
    // 3. Create allowance account if it doesn't exist
    // 4. Update allowance amount
    // 5. Store allowance data
    
    // For now, basic structure is in place
    // Full implementation requires complete raw pattern extraction
    
    Ok(())
}
