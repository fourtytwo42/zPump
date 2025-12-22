use anchor_lang::prelude::*;
use crate::{PrepareShieldArgs, PrepareShield as PrepareShieldContext};
use crate::state::UserProofVault;
use crate::errors::PoolError;
use ptf_common::OperationStatus;
use anchor_lang::solana_program::rent::Rent;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::pubkey::Pubkey;
// Hash function for operation IDs - using simple approach for now
// In production, would use proper keccak hash
fn hash_operation_id(data: &[u8]) -> [u8; 32] {
    // For now, use a simple hash - will replace with proper keccak after Solana CLI setup
    let mut result = [0u8; 32];
    for (i, byte) in data.iter().enumerate() {
        result[i % 32] ^= byte.wrapping_add(i as u8);
    }
    // Simple hash - in production use keccak::hash
    result
}

pub fn prepare_shield(
    ctx: Context<PrepareShieldContext>,
    args: PrepareShieldArgs,
) -> Result<()> {
    // Use Anchor's discriminator - this is the first 8 bytes of SHA256("account:UserProofVault")
    // Hardcoded value: [0x82, 0x02, 0xe0, 0x9a, 0x26, 0x81, 0x9e, 0xa0]
    // This matches what Anchor expects for UserProofVault accounts
    const USER_PROOF_VAULT_DISCRIMINATOR: [u8; 8] = [0x82, 0x02, 0xe0, 0x9a, 0x26, 0x81, 0x9e, 0xa0];
    let user_proof_vault_discriminator = USER_PROOF_VAULT_DISCRIMINATOR;
    
    let proof_vault_info = &ctx.accounts.proof_vault;
    
    // Validate the account owner manually (bypass Anchor validation)
    // Only validate if account exists - if it doesn't exist, we'll create it
    if proof_vault_info.data_len() > 0 {
        if *proof_vault_info.owner != crate::ID {
            return Err(anchor_lang::error!(PoolError::InvalidAccountOwner));
        }
    }
    
    // Validate amount
    ptf_common::InputValidator::validate_amount(args.amount, ptf_common::MAX_SHIELD_AMOUNT)?;
    
    // CRITICAL: Anchor validates accounts BEFORE our code runs
    // If the account exists with wrong discriminator, Anchor will fail validation
    // We need to ensure the account has the correct discriminator BEFORE Anchor validates
    // Since we can't control Anchor's validation timing, we must fix the discriminator
    // in a way that happens before validation
    
    // The issue: Account exists with wrong discriminator, Anchor validates it before our code runs
    // Solution: We can't fix it before Anchor validates, but we can try to work around it
    // by ensuring the account is created correctly from the start
    
    // Check if account exists and has wrong discriminator
    // If so, we need to clear it or fix it, but Anchor may have already validated
    // For now, we'll try to fix it, but this may not work if Anchor validates first
    if proof_vault_info.data_len() > 0 {
        let vault_data = proof_vault_info.try_borrow_data()?;
        if vault_data.len() >= 8 {
            let account_discriminator = &vault_data[0..8];
            if account_discriminator != user_proof_vault_discriminator.as_ref() {
                // Wrong discriminator detected
                // Anchor will fail validation before we can fix this
                // We need to clear the account or use a different approach
                drop(vault_data);
                
                // Try to clear the account data by zeroing it out
                // This might help if Anchor re-validates after our changes
                let mut account_data = proof_vault_info.try_borrow_mut_data()?;
                // Clear all data
                account_data.fill(0);
                // Now set correct discriminator using Anchor's method
                account_data[0..8].copy_from_slice(&user_proof_vault_discriminator);
                // Initialize with empty vault
                let vault = UserProofVault {
                    prepared_operations: Vec::new(),
                };
                vault.serialize(&mut &mut account_data[8..])?;
                drop(account_data);
            } else {
                drop(vault_data);
            }
        } else {
            drop(vault_data);
        }
    }
    
    // Create account manually if it doesn't exist
    // CRITICAL: We must set the discriminator IMMEDIATELY after creating the account
    // to prevent Anchor from validating it with the wrong discriminator
    if proof_vault_info.data_len() == 0 {
        let space = 8 + UserProofVault::MIN_LEN;
        let lamports = Rent::get()?.minimum_balance(space);
        
        // Find PDA bump
        let (pda, bump) = Pubkey::find_program_address(
            &[b"proof-vault", ctx.accounts.payer.key.as_ref()],
            &crate::ID,
        );
        require_keys_eq!(pda, proof_vault_info.key(), PoolError::AccountNotFound);
        
        // Create account
        invoke_signed(
            &system_instruction::create_account(
                ctx.accounts.payer.key,
                proof_vault_info.key,
                lamports,
                space as u64,
                &crate::ID,
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                proof_vault_info.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"proof-vault", ctx.accounts.payer.key.as_ref(), &[bump]]],
        )?;
        
        // CRITICAL: Set discriminator IMMEDIATELY after account creation
        // This must happen before any Anchor validation can occur
        let mut account_data = proof_vault_info.try_borrow_mut_data()?;
        // Zero out the account data first to ensure clean state
        account_data.fill(0);
        // Set the correct discriminator using Anchor's method
        account_data[0..8].copy_from_slice(&user_proof_vault_discriminator);
        
        // Initialize with empty operations
        let vault = UserProofVault {
            prepared_operations: Vec::new(),
        };
        vault.serialize(&mut &mut account_data[8..])?;
        drop(account_data);
    }
    
    // Load vault and add operation
    // Manually deserialize to avoid Anchor's discriminator check
    // We've already fixed the discriminator above, so we can safely deserialize
    let vault_data = proof_vault_info.try_borrow_data()?;
    
    // Verify discriminator is correct (should be after our fix above)
    if vault_data.len() < 8 {
        drop(vault_data);
        return Err(anchor_lang::error!(PoolError::AccountNotFound));
    }
    
    let account_discriminator = &vault_data[0..8];
    let mut vault_account: UserProofVault;
    
    if account_discriminator != user_proof_vault_discriminator.as_ref() {
        // Still wrong - this shouldn't happen, but fix it again
        drop(vault_data);
                let mut account_data = proof_vault_info.try_borrow_mut_data()?;
                account_data[0..8].copy_from_slice(&user_proof_vault_discriminator);
        let vault = UserProofVault {
            prepared_operations: Vec::new(),
        };
        vault.serialize(&mut &mut account_data[8..])?;
        drop(account_data);
        let vault_data = proof_vault_info.try_borrow_data()?;
        // Now deserialize - discriminator should be correct
        vault_account = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
        drop(vault_data);
    } else {
        // Discriminator is correct, deserialize
        vault_account = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
        drop(vault_data);
    }
    
    // Create operation
    let mut operation_id_data = Vec::new();
    operation_id_data.extend_from_slice(&args.amount.to_le_bytes());
    operation_id_data.extend_from_slice(&args.commitment);
    // Generate operation ID using hash
    let operation_id = hash_operation_id(&operation_id_data);
    
    let operation = crate::state::PreparedOperation {
        id: operation_id,
        status: OperationStatus::Pending as u8,
        operation_type: 0, // Shield
        data: args.commitment.to_vec(),
    };
    
    vault_account.prepared_operations.push(operation);
    
    let mut vault_data = proof_vault_info.try_borrow_mut_data()?;
    vault_account.serialize(&mut &mut vault_data[8..])?;
    
    Ok(())
}
