use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::Sysvar;
use crate::state::VerifyingKeyAccount;
use crate::errors::VerifierError;
use crate::verification::{VerifyingKey, verify_groth16_proof};

pub fn verify_groth16(
    ctx: Context<VerifyGroth16>,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
) -> Result<()> {
    let verifying_key = &ctx.accounts.verifying_key;
    
    // Check if key is revoked
    require!(!verifying_key.revoked, VerifierError::KeyRevoked);
    
    // Validate proof size (Groth16 proof is 256 bytes: a (G1, 64) + b (G2, 128) + c (G1, 64))
    require!(proof.len() == 256, VerifierError::InvalidProof);
    
    // Validate public inputs size (should be 32 bytes per input)
    require!(
        public_inputs.len() > 0 && public_inputs.len() % 32 == 0,
        VerifierError::InvalidPublicInputs
    );
    
    // Extract proof components
    // Standard Groth16 proof format: a (G1, 64 bytes) + b (G2, 128 bytes) + c (G1, 64 bytes) = 256 bytes
    // Some implementations may use compressed formats, but 256 bytes is the standard
    
    require!(
        proof.len() == 256,
        VerifierError::InvalidProof
    );
    
    let mut proof_a = [0u8; 64];
    let mut proof_b = [0u8; 128];
    let mut proof_c = [0u8; 64];
    
    // Standard 256-byte format
    proof_a.copy_from_slice(&proof[0..64]);
    proof_b.copy_from_slice(&proof[64..192]);
    proof_c.copy_from_slice(&proof[192..256]);
    
    // Parse verifying key
    let vk = VerifyingKey::parse(&verifying_key.key_data)?;
    
    // WARNING: This instruction performs structure validation only, not actual cryptographic verification
    // Solana does not support alt_bn128 pairing checks natively
    // 
    // For production use, use verify_with_attestation instead, which verifies proofs using
    // an external verifier service that performs actual Groth16 pairing checks
    
    // Perform Groth16 verification (structure validation only)
    let is_valid = verify_groth16_proof(
        &proof_a,
        &proof_b,
        &proof_c,
        &vk,
        &public_inputs,
    )?;
    
    require!(is_valid, VerifierError::ProofVerificationFailed);
    
    msg!("WARNING: Groth16 proof structure validated (not cryptographically verified)");
    msg!("For production, use verify_with_attestation with external verifier service");
    msg!("Proof size: {} bytes", proof.len());
    msg!("Public inputs size: {} bytes", public_inputs.len());
    
    Ok(())
}

#[derive(Accounts)]
pub struct VerifyGroth16<'info> {
    /// CHECK: Verifying key account
    pub verifying_key: Account<'info, VerifyingKeyAccount>,
}

