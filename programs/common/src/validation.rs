use anchor_lang::prelude::*;
use solana_program::account_info::AccountInfo;
use solana_program::pubkey::Pubkey;
use crate::errors::CommonError;
use crate::types::{MIN_AMOUNT, MAX_AMOUNT, MAX_PROOF_SIZE, MIN_PROOF_SIZE, MAX_PUBLIC_INPUTS_SIZE};

pub struct InputValidator;

impl InputValidator {
    pub fn validate_amount(amount: u64, max_amount: u64) -> Result<()> {
        require!(amount >= MIN_AMOUNT, CommonError::InvalidAmount);
        require!(amount <= max_amount.min(MAX_AMOUNT), CommonError::InvalidAmount);
        Ok(())
    }
    
    pub fn validate_amount_range(amount: u64, min: u64, max: u64) -> Result<()> {
        require!(amount >= min, CommonError::InvalidAmount);
        require!(amount <= max, CommonError::InvalidAmount);
        Ok(())
    }
}

pub struct InputSanitizer;

impl InputSanitizer {
    pub fn sanitize_proof(proof: &[u8], max_size: usize) -> Result<()> {
        require!(proof.len() <= max_size.min(MAX_PROOF_SIZE), CommonError::InvalidAmount);
        require!(proof.len() >= MIN_PROOF_SIZE, CommonError::InvalidAmount);
        Ok(())
    }
    
    pub fn sanitize_public_inputs(inputs: &[u8], max_size: usize) -> Result<()> {
        require!(inputs.len() <= max_size.min(MAX_PUBLIC_INPUTS_SIZE), CommonError::InvalidAmount);
        Ok(())
    }
}

pub fn validate_account(
    account_info: &AccountInfo,
    expected_owner: &Pubkey,
    min_data_len: usize,
) -> Result<()> {
    require!(
        *account_info.owner == *expected_owner,
        CommonError::InvalidAccountOwner
    );
    require!(
        account_info.data_len() >= min_data_len,
        CommonError::AccountDataTooShort
    );
    Ok(())
}

pub fn validate_account_relationship(
    parent_account: &AccountInfo,
    child_account: &AccountInfo,
) -> Result<()> {
    require!(
        *child_account.owner == *parent_account.key,
        CommonError::InvalidAccountOwner
    );
    Ok(())
}

