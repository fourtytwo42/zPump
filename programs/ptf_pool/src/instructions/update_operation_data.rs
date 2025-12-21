// Update operation data in vault (adds proof + attestation after preparation)

use anchor_lang::prelude::*;
use crate::{UpdateOperationData as UpdateOperationDataContext};
use crate::state::UserProofVault;
use crate::errors::PoolError;
use ptf_common::OperationStatus;

pub fn update_operation_data(
    ctx: Context<UpdateOperationDataContext>,
    operation_id: [u8; 32],
    operation_data: Vec<u8>,
) -> Result<()> {
    // Load vault
    let vault_data = ctx.accounts.proof_vault.try_borrow_data()?;
    let mut vault: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    drop(vault_data);
    
    // Find operation
    let operation = vault.prepared_operations.iter_mut()
        .find(|op| op.id() == &operation_id)
        .ok_or(PoolError::OperationNotFound)?;
    
    // Verify status is Pending (can only update pending operations)
    require!(
        operation.status() == OperationStatus::Pending,
        PoolError::InvalidOperationStatus
    );
    
    // Update operation data (proof + attestation + public_inputs)
    operation.data = operation_data;
    
    // Serialize back
    let mut vault_data = ctx.accounts.proof_vault.try_borrow_mut_data()?;
    vault.serialize(&mut &mut vault_data[8..])?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateOperationData<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Proof vault PDA
    #[account(mut)]
    pub proof_vault: UncheckedAccount<'info>,
}

