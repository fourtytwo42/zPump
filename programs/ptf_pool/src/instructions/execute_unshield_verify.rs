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
    
    // Verify proof via CPI to verifier program using attestation
    // Operation data format: [proof (256 bytes)][attestation (169 bytes)][public_inputs (variable)]
    // Attestation structure: proof_hash (32) + public_inputs_hash (32) + verifying_key_hash (32) + 
    //                         is_valid (1) + timestamp (8) + signature (64) = 169 bytes
    
    require!(
        operation.data.len() >= 256 + 169,
        PoolError::InvalidOperationStatus // Use as generic error for now
    );
    
    // Extract proof (256 bytes)
    let proof = operation.data[0..256].to_vec();
    
    // Extract attestation (169 bytes) - manually parse since it's a fixed-size struct
    let attestation_bytes = &operation.data[256..256 + 169];
    require!(
        attestation_bytes.len() == 169,
        PoolError::InvalidOperationStatus
    );
    
    // Parse attestation: proof_hash (32) + public_inputs_hash (32) + verifying_key_hash (32) + 
    //                    is_valid (1) + timestamp (8) + signature (64) = 169 bytes
    let mut offset = 0;
    let mut proof_hash = [0u8; 32];
    proof_hash.copy_from_slice(&attestation_bytes[offset..offset + 32]);
    offset += 32;
    
    let mut public_inputs_hash = [0u8; 32];
    public_inputs_hash.copy_from_slice(&attestation_bytes[offset..offset + 32]);
    offset += 32;
    
    let mut verifying_key_hash = [0u8; 32];
    verifying_key_hash.copy_from_slice(&attestation_bytes[offset..offset + 32]);
    offset += 32;
    
    let is_valid = attestation_bytes[offset] != 0;
    offset += 1;
    
    let timestamp = i64::from_le_bytes([
        attestation_bytes[offset],
        attestation_bytes[offset + 1],
        attestation_bytes[offset + 2],
        attestation_bytes[offset + 3],
        attestation_bytes[offset + 4],
        attestation_bytes[offset + 5],
        attestation_bytes[offset + 6],
        attestation_bytes[offset + 7],
    ]);
    offset += 8;
    
    let mut signature = [0u8; 64];
    signature.copy_from_slice(&attestation_bytes[offset..offset + 64]);
    
    let attestation = ptf_verifier_groth16::instructions::verify_with_attestation::VerificationAttestation {
        proof_hash,
        public_inputs_hash,
        verifying_key_hash,
        is_valid,
        timestamp,
        signature,
    };
    
    // Extract public inputs (remaining bytes)
    let public_inputs = if operation.data.len() > 256 + 169 {
        operation.data[256 + 169..].to_vec()
    } else {
        vec![0u8; 32] // Default public input
    };
    
    // CPI to verifier program with attestation
    let cpi_program = ctx.accounts.verifier_program.to_account_info();
    let cpi_accounts = ptf_verifier_groth16::cpi::accounts::VerifyWithAttestation {
        verifying_key: ctx.accounts.verifying_key.to_account_info(),
        external_verifier: ctx.accounts.external_verifier.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    ptf_verifier_groth16::cpi::verify_with_attestation(cpi_ctx, proof, public_inputs, attestation)?;
    
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
