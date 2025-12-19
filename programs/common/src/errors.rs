use anchor_lang::prelude::*;

#[error_code]
pub enum CommonError {
    #[msg("Account not found")]
    AccountNotFound,
    #[msg("Invalid account owner")]
    InvalidAccountOwner,
    #[msg("Account data too short")]
    AccountDataTooShort,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Proof verification failed")]
    VerifierMismatch,
}

