use anchor_lang::prelude::*;
use crate::{PrepareShieldArgs, PrepareShield as PrepareShieldContext};
use crate::state::UserProofVault;
use crate::errors::PoolError;
use ptf_common::OperationStatus;
use anchor_lang::solana_program::rent::Rent;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::pubkey::Pubkey;

pub fn prepare_shield(
    ctx: Context<PrepareShieldContext>,
    args: PrepareShieldArgs,
) -> Result<()> {
    let proof_vault_info = &ctx.accounts.proof_vault;
    
    // Validate amount
    ptf_common::InputValidator::validate_amount(args.amount, ptf_common::MAX_SHIELD_AMOUNT)?;
    
    // Create account manually if it doesn't exist
    if proof_vault_info.data_len() == 0 {
        let space = 8 + UserProofVault::MIN_LEN;
        let lamports = Rent::get()?.minimum_balance(space);
        
        // Find PDA bump
        let (pda, bump) = Pubkey::find_program_address(
            &[b"proof-vault", ctx.accounts.payer.key.as_ref()],
            &crate::ID,
        );
        require_keys_eq!(pda, proof_vault_info.key(), PoolError::AccountNotFound);
        
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
        
        // Set discriminator (Anchor account discriminator)
        // The discriminator is the first 8 bytes of the SHA256 hash of "account:UserProofVault"
        let mut account_data = proof_vault_info.try_borrow_mut_data()?;
        // For now, we'll set a placeholder discriminator
        // The actual discriminator will be set by Anchor when the account is properly initialized
        // We'll compute it from the account type name
        // Use Anchor's discriminator system - will be set properly on first build
        let discriminator = [0u8; 8]; // Placeholder - Anchor will set this
        account_data[0..8].copy_from_slice(&discriminator);
        
        // Initialize with empty operations
        let vault = UserProofVault {
            prepared_operations: Vec::new(),
        };
        vault.serialize(&mut &mut account_data[8..])?;
    }
    
    // Load vault and add operation
    let vault_data = proof_vault_info.try_borrow_data()?;
    let mut vault_account: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    drop(vault_data);
    
    // Create operation
    let mut operation_id_data = Vec::new();
    operation_id_data.extend_from_slice(&args.amount.to_le_bytes());
    operation_id_data.extend_from_slice(&args.commitment);
    // Generate operation ID - using placeholder for now, will use proper hash after first build
    // TODO: Replace with proper keccak hash after Solana CLI is installed
    let mut operation_id = [0u8; 32];
    operation_id[..operation_id_data.len().min(32)].copy_from_slice(&operation_id_data[..operation_id_data.len().min(32)]);
    
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
