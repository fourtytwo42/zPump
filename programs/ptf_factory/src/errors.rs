use anchor_lang::prelude::*;

#[error_code]
pub enum FactoryError {
    #[msg("Factory already initialized")]
    AlreadyInitialized,
    #[msg("Mint already registered")]
    MintAlreadyRegistered,
    #[msg("Mint not found")]
    MintNotFound,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Invalid pool")]
    InvalidPool,
}

