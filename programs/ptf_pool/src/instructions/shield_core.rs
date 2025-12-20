use anchor_lang::prelude::*;
use crate::state::{PoolState, CommitmentTree, NoteLedger, DEPTH};
use crate::errors::PoolError;
use ptf_common::{InputValidator, InputSanitizer, check_rate_limit, OperationType};
use anchor_lang::solana_program::sysvar::Sysvar;
use anchor_lang::solana_program::clock::Clock;
// Hash function for Merkle tree - using simple approach for now
// In production, would use proper hash function
fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    // Simple hash combining left and right
    // In production, would use proper cryptographic hash
    let mut data = Vec::new();
    data.extend_from_slice(left);
    data.extend_from_slice(right);
    let mut result = [0u8; 32];
    for (i, byte) in data.iter().enumerate() {
        result[i % 32] ^= byte.wrapping_add(i as u8);
    }
    result
}

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
    
    // Update commitment tree with Merkle tree insertion
    let insert_index = tree.next_index;
    tree.next_index = tree.next_index.checked_add(1)
        .ok_or(PoolError::InvalidAmount)?;
    
    // Insert commitment into Merkle tree using frontier-based approach
    // The frontier represents the rightmost path in the tree
    let mut current_hash = commitment;
    let mut current_index = insert_index;
    
    // Traverse up the tree, updating frontier and computing hashes
    for level in 0..DEPTH {
        let bit = (current_index >> level) & 1;
        
        if bit == 0 {
            // We're the left child at this level
            // Right sibling is either in frontier (if exists) or zero
            let right_hash = if (current_index | ((1u64 << level) - 1)) < insert_index {
                // Right sibling exists - would need to fetch from tree
                // For now, use zero (simplified - full implementation would store siblings)
                tree.zeroes[level]
            } else {
                // Use zero value for right sibling
                tree.zeroes[level]
            };
            
            // Compute parent hash: hash(left || right)
            current_hash = hash_pair(&current_hash, &right_hash);
        } else {
            // We're the right child at this level
            // Left sibling is in the frontier
            let left_hash = tree.frontier[level];
            
            // Compute parent hash: hash(left || right)
            current_hash = hash_pair(&left_hash, &current_hash);
        }
        
        // Update frontier at this level (always store the rightmost node)
        tree.frontier[level] = current_hash;
        
        current_index = current_index >> 1;
    }
    
    // The root is the top of the frontier
    let new_root = tree.frontier[DEPTH - 1];
    
    // Add commitment to recent commitments
    if (tree.recent_len as usize) < crate::state::MAX_CANOPY {
        let idx = tree.recent_len as usize;
        tree.recent_commitments[idx] = commitment;
        // Convert amount to 32-byte array (pad with zeros)
        let mut amount_bytes = [0u8; 32];
        let amount_le = amount.to_le_bytes();
        amount_bytes[0..8].copy_from_slice(&amount_le);
        tree.recent_amount_commitments[idx] = amount_bytes;
        tree.recent_indices[idx] = insert_index;
        tree.recent_len += 1;
    }
    
    // Update current root
    pool.current_root = new_root;
    tree.current_root = new_root;
    
    // Update recent roots in pool state
    if pool.recent_roots_len < 16 {
        let idx = pool.recent_roots_len as usize;
        pool.recent_roots[idx] = new_root;
        pool.recent_roots_len += 1;
    } else {
        // Shift recent roots
        for i in 0..15 {
            pool.recent_roots[i] = pool.recent_roots[i + 1];
        }
        pool.recent_roots[15] = new_root;
    }
    
    // Add note to ledger
    note_ledger.notes.push(commitment);
    
    Ok(())
}

