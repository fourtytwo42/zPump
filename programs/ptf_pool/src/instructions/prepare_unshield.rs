use anchor_lang::prelude::*;
use crate::{PrepareUnshieldArgs, PrepareUnshield as PrepareUnshieldContext};
use crate::state::UserProofVault;
use crate::errors::PoolError;
use ptf_common::OperationStatus;
use solana_program::rent::Rent;
use solana_program::system_instruction;
use solana_program::program::invoke_signed;
use solana_program::pubkey::Pubkey;

pub fn prepare_unshield(
    ctx: Context<PrepareUnshieldContext>,
    args: PrepareUnshieldArgs,
) -> Result<[u8; 32]> {
    let proof_vault_info = &ctx.accounts.proof_vault;
    
    // Validate amount
    ptf_common::InputValidator::validate_amount(args.amount, ptf_common::MAX_UNSHIELD_AMOUNT)?;
    
    // Create account manually if it doesn't exist
    if proof_vault_info.data_len() == 0 {
        let space = 8 + UserProofVault::MIN_LEN + 1000; // Extra space for operations
        let lamports = Rent::get()?.minimum_balance(space);
        
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
        let mut account_data = proof_vault_info.try_borrow_mut_data()?;
        // The discriminator is the first 8 bytes of the SHA256 hash of "account:UserProofVault"
        let discriminator_preimage = b"account:UserProofVault";
        let discriminator = anchor_lang::solana_program::keccak::hash(discriminator_preimage).to_bytes()[0..8].to_vec();
        account_data[0..8].copy_from_slice(&discriminator);
        
        let vault = UserProofVault {
            prepared_operations: Vec::new(),
        };
        vault.serialize(&mut &mut account_data[8..])?;
    }
    
    // Load vault and add operation
    let vault_data = proof_vault_info.try_borrow_data()?;
    let mut vault_account: UserProofVault = UserProofVault::try_deserialize(&mut &vault_data[8..])?;
    drop(vault_data);
    
    // Generate operation_id
    let mut operation_id_data = Vec::new();
    operation_id_data.extend_from_slice(&args.nullifier);
    operation_id_data.extend_from_slice(&args.amount.to_le_bytes());
    operation_id_data.extend_from_slice(args.recipient.as_ref());
    let operation_id = anchor_lang::solana_program::keccak::hash(&operation_id_data).to_bytes();
    
    // Create operation with status Pending
    let mut operation_data = Vec::new();
    operation_data.extend_from_slice(&args.nullifier);
    operation_data.extend_from_slice(&args.amount.to_le_bytes());
    operation_data.extend_from_slice(args.recipient.as_ref());
    
    let operation = crate::state::PreparedOperation {
        id: operation_id,
        status: OperationStatus::Pending as u8,
        operation_type: 1, // Unshield
        data: operation_data,
    };
    
    vault_account.prepared_operations.push(operation);
    
    let mut vault_data = proof_vault_info.try_borrow_mut_data()?;
    vault_account.serialize(&mut &mut vault_data[8..])?;
    
    Ok(operation_id)
}
