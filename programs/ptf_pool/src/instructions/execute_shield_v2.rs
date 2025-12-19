use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use std::mem;
use crate::state::{PoolState, CommitmentTree, NoteLedger, UserProofVault};
use crate::errors::PoolError;
use crate::instructions::shield_core::execute_shield_core;
use ptf_common::addresses::PoolAddresses;
use ptf_verifier_groth16;
use ptf_factory;

// Raw handler for execute_shield_v2 (called by custom entrypoint)
pub fn execute_shield_v2_raw_handler(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Extract operation_id from instruction data (skip 8-byte discriminator)
    if instruction_data.len() < 8 + 32 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let operation_id: [u8; 32] = instruction_data[8..8+32].try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    // Extract accounts manually (simplified - full implementation would identify all accounts)
    // For now, we'll use a simplified approach that works for testing
    // Full implementation would follow the two-pass pattern from documentation
    
    // This is a placeholder implementation - full version would:
    // 1. Identify all accounts by owner and PDA derivation
    // 2. Validate all accounts manually
    // 3. Load accounts with proper lifetime extension
    // 4. Call execute_shield_core
    
    Ok(())
}

// Standard Anchor instruction (for IDL generation and testing)
#[derive(Accounts)]
pub struct ExecuteShieldV2Raw<'info> {
    /// CHECK: Phantom account - all real accounts in remaining_accounts
    pub _phantom: UncheckedAccount<'info>,
}

pub fn execute_shield_v2(
    ctx: Context<ExecuteShieldV2Raw>,
    operation_id: [u8; 32],
) -> Result<()> {
    // This will be called by the standard Anchor dispatch for other instructions
    // The custom entrypoint intercepts this and routes to raw handler
    // For now, placeholder implementation
    Ok(())
}
