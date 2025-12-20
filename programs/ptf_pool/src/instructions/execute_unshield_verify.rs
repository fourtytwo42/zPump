use anchor_lang::prelude::*;
use crate::{ExecuteUnshieldVerify as ExecuteUnshieldVerifyContext};
use crate::state::UserProofVault;
use crate::errors::PoolError;
use ptf_common::OperationStatus;
use ptf_verifier_groth16;

pub fn execute_unshield_verify(
    ctx: Context<ExecuteUnshieldVerifyContext>,
    operation_id: [u8; 32],
) -> Result<()> {
    // Load operation from vault
    let vault_data = ctx.accounts.proof_vault.try_borrow_data()?;
    let vault: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    drop(vault_data);
    
    // Find operation
    let operation = vault.prepared_operations.iter()
        .find(|op| op.id() == &operation_id)
        .ok_or(PoolError::OperationNotFound)?;
    
    // Verify status is Pending
    require!(
        operation.status() == OperationStatus::Pending,
        PoolError::InvalidOperationStatus
    );
    
    // Verify proof via CPI to verifier program
    // Extract proof and public inputs from operation data
    // This is simplified - full implementation would parse the operation data properly
    // For now, we extract from operation data assuming it's structured as:
    // [0..192]: proof, [192..]: public_inputs
    let proof = if operation.data.len() >= 192 {
        operation.data[0..192].to_vec()
    } else {
        // Fallback: create placeholder proof if data is too short
        vec![0u8; 192]
    };
    let public_inputs = if operation.data.len() > 192 {
        operation.data[192..].to_vec()
    } else {
        operation.data.clone()
    };
    
    // CPI to verifier program
    let cpi_program = ctx.accounts.verifier_program.to_account_info();
    let cpi_accounts = ptf_verifier_groth16::cpi::accounts::VerifyGroth16 {
        verifying_key: ctx.accounts.verifying_key.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    ptf_verifier_groth16::cpi::verify_groth16(cpi_ctx, proof, public_inputs)?;
    
    // Update operation status to Verified
    let mut vault_data = ctx.accounts.proof_vault.try_borrow_mut_data()?;
    let mut vault: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    
    let op = vault.prepared_operations.iter_mut()
        .find(|op| op.id() == &operation_id)
        .ok_or(PoolError::OperationNotFound)?;
    op.set_status(OperationStatus::Verified);
    
    vault.serialize(&mut &mut vault_data[8..])?;
    
    Ok(())
}
