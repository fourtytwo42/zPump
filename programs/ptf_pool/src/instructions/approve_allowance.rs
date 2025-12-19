use anchor_lang::prelude::*;
use crate::{ApproveAllowanceArgs, ApproveAllowance as ApproveAllowanceContext};
use crate::errors::PoolError;
use ptf_common::InputValidator;

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
    
    // This is a placeholder - full implementation would:
    // 1. Extract accounts from remaining_accounts using raw pattern
    // 2. Create or update allowance PDA account
    // 3. Store allowance amount
    
    Ok(())
}
