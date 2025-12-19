use anchor_lang::prelude::*;
use crate::{ExecuteUnshieldUpdate as ExecuteUnshieldUpdateContext};
use crate::state::{PoolState, CommitmentTree, NullifierSet, UserProofVault};
use crate::errors::PoolError;
use ptf_common::OperationStatus;

pub fn execute_unshield_update(
    ctx: Context<ExecuteUnshieldUpdateContext>,
    operation_id: [u8; 32],
) -> Result<()> {
    // Load operation
    let vault_data = ctx.accounts.proof_vault.try_borrow_data()?;
    let vault: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    drop(vault_data);
    
    let operation = vault.prepared_operations.iter()
        .find(|op| op.id() == &operation_id)
        .ok_or(PoolError::OperationNotFound)?;
    
    // Verify status is Verified
    require!(
        operation.status() == OperationStatus::Verified,
        PoolError::InvalidOperationStatus
    );
    
    // Extract nullifier from operation data (first 32 bytes)
    let nullifier: [u8; 32] = operation.data[0..32].try_into()
        .map_err(|_| PoolError::InvalidNullifier)?;
    
    // Update tree (simplified - full implementation would update Merkle tree properly)
    let tree = &mut ctx.accounts.commitment_tree;
    // Tree update logic would go here
    
    // Update nullifier set
    let mut nullifier_set = ctx.accounts.nullifier_set.to_account_info();
    let mut nullifier_data = nullifier_set.try_borrow_mut_data()?;
    let mut nullifier_account: NullifierSet = NullifierSet::try_deserialize(&mut &nullifier_data[8..])?;
    drop(nullifier_data);
    
    // Check if nullifier already used
    require!(
        !nullifier_account.nullifiers.contains(&nullifier),
        PoolError::NullifierAlreadyUsed
    );
    
    nullifier_account.nullifiers.push(nullifier);
    
    let mut nullifier_data = nullifier_set.try_borrow_mut_data()?;
    nullifier_account.serialize(&mut &mut nullifier_data[8..])?;
    
    // Update operation status to Updated
    let mut vault_data = ctx.accounts.proof_vault.try_borrow_mut_data()?;
    let mut vault: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    
    let op = vault.prepared_operations.iter_mut()
        .find(|op| op.id() == &operation_id)
        .ok_or(PoolError::OperationNotFound)?;
    op.set_status(OperationStatus::Updated);
    
    vault.serialize(&mut &mut vault_data[8..])?;
    
    Ok(())
}
