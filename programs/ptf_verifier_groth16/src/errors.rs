use anchor_lang::prelude::*;

#[error_code]
pub enum VerifierError {
    #[msg("Verifying key already exists")]
    KeyAlreadyExists = 6000,
    #[msg("Verifying key not found")]
    KeyNotFound = 6001,
    #[msg("Verifying key revoked")]
    KeyRevoked = 6002,
    #[msg("Invalid proof")]
    InvalidProof = 6003,
    #[msg("Invalid public inputs")]
    InvalidPublicInputs = 6004,
    #[msg("Proof verification failed")]
    ProofVerificationFailed = 6005,
    #[msg("Invalid authority")]
    InvalidAuthority = 6006,
    #[msg("Key already revoked")]
    AlreadyRevoked = 6012,
}

