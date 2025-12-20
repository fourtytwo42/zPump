use anchor_lang::prelude::*;
use crate::{ExecuteUnshieldWithdraw as ExecuteUnshieldWithdrawContext};
use crate::state::{PoolState, UserProofVault};
use crate::errors::PoolError;
use ptf_common::OperationStatus;
use ptf_vault;

pub fn execute_unshield_withdraw(
    ctx: Context<ExecuteUnshieldWithdrawContext>,
    operation_id: [u8; 32],
) -> Result<()> {
    // Load operation
    let vault_data = ctx.accounts.proof_vault.try_borrow_data()?;
    let vault: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    drop(vault_data);
    
    let operation = vault.prepared_operations.iter()
        .find(|op| op.id() == &operation_id)
        .ok_or(PoolError::OperationNotFound)?;
    
    // Verify status is Updated
    require!(
        operation.status() == OperationStatus::Updated,
        PoolError::InvalidOperationStatus
    );
    
    // Extract amount and recipient from operation data
    let amount = u64::from_le_bytes(
        operation.data[32..40].try_into()
            .map_err(|_| PoolError::InvalidAmount)?
    );
    
    // Withdraw from vault via CPI
    let cpi_program = ctx.accounts.vault_program.to_account_info();
    let cpi_accounts = ptf_vault::cpi::accounts::Withdraw {
        vault: ctx.accounts.vault_state.to_account_info(),
        authority: ctx.accounts.pool_state.to_account_info(),
        vault_token_account: ctx.accounts.vault_token_account.to_account_info(),
        user_token_account: ctx.accounts.user_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    ptf_vault::cpi::withdraw(cpi_ctx, amount)?;
    
    // Remove operation from vault
    let mut vault_data = ctx.accounts.proof_vault.try_borrow_mut_data()?;
    let mut vault: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    
    vault.prepared_operations.retain(|op| op.id() != &operation_id);
    
    vault.serialize(&mut &mut vault_data[8..])?;
    
    Ok(())
}
