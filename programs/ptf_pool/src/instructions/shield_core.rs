use anchor_lang::prelude::*;
use crate::state::{PoolState, CommitmentTree, NoteLedger};
use crate::errors::PoolError;
use ptf_common::{InputValidator, InputSanitizer, check_rate_limit, OperationType};
use solana_program::sysvar::Sysvar;
use solana_program::clock::Clock;

#[inline(never)]
pub fn execute_shield_core(
    pool_state: &mut Account<'_, PoolState>,
    commitment_tree: &mut Account<'_, CommitmentTree>,
    note_ledger: &mut Account<'_, NoteLedger>,
    _proof: Vec<u8>,
    _public_inputs: Vec<u8>,
    commitment: [u8; 32],
    amount: u64,
) -> Result<()> {
    let pool = pool_state;
    let tree = commitment_tree;
    
    // Validate inputs
    InputValidator::validate_amount(amount, ptf_common::MAX_SHIELD_AMOUNT)?;
    InputSanitizer::sanitize_proof(&_proof, ptf_common::MAX_PROOF_SIZE)?;
    InputSanitizer::sanitize_public_inputs(&_public_inputs, ptf_common::MAX_PUBLIC_INPUTS_SIZE)?;
    
    // Check rate limit
    let clock = Clock::get()?;
    check_rate_limit(
        pool.last_operation_slot,
        OperationType::Shield,
        clock.slot,
    )?;
    
    // Update pool state
    pool.last_operation_slot = clock.slot;
    pool.operation_count = pool.operation_count.checked_add(1)
        .ok_or(PoolError::InvalidAmount)?;
    
    // Update commitment tree (simplified - full implementation would update Merkle tree)
    tree.next_index = tree.next_index.checked_add(1)
        .ok_or(PoolError::InvalidAmount)?;
    
    // Add commitment to recent commitments
    if (tree.recent_len as usize) < crate::state::MAX_CANOPY {
        let idx = tree.recent_len as usize;
        tree.recent_commitments[idx] = commitment;
        // Convert amount to 32-byte array (pad with zeros)
        let mut amount_bytes = [0u8; 32];
        let amount_le = amount.to_le_bytes();
        amount_bytes[0..8].copy_from_slice(&amount_le);
        tree.recent_amount_commitments[idx] = amount_bytes;
        tree.recent_indices[idx] = tree.next_index - 1;
        tree.recent_len += 1;
    }
    
    // Update current root (simplified - would compute from tree)
    pool.current_root = commitment; // Placeholder - full implementation would compute Merkle root
    tree.current_root = commitment;
    
    // Add note to ledger
    note_ledger.notes.push(commitment);
    
    Ok(())
}

