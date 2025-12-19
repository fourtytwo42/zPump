use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Vault already initialized")]
    AlreadyInitialized,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Token account mismatch")]
    TokenAccountMismatch,
}

