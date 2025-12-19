use anchor_lang::prelude::*;

#[error_code]
pub enum PoolError {
    #[msg("Account not found")]
    AccountNotFound = 0x1770,
    #[msg("Invalid account owner")]
    InvalidAccountOwner = 0x1771,
    #[msg("Account data too short")]
    AccountDataTooShort = 0x1772,
    #[msg("Invalid amount")]
    InvalidAmount = 0x1773,
    #[msg("Amount too small")]
    AmountTooSmall = 0x1774,
    #[msg("Amount too large")]
    AmountTooLarge = 0x1775,
    #[msg("Proof verification failed")]
    VerifierMismatch = 0x1780,
    #[msg("Invalid nullifier")]
    InvalidNullifier = 0x1781,
    #[msg("Nullifier already used")]
    NullifierAlreadyUsed = 0x1782,
    #[msg("Invalid root")]
    InvalidRoot = 0x1783,
    #[msg("Root mismatch")]
    RootMismatch = 0x1784,
    #[msg("Origin mint mismatch")]
    OriginMintMismatch = 0x1785,
    #[msg("Rate limit exceeded")]
    RateLimitExceeded = 0x1786,
    #[msg("Operation in progress")]
    OperationInProgress = 0x1787,
    #[msg("Operation not found")]
    OperationNotFound = 0x1788,
    #[msg("Invalid operation status")]
    InvalidOperationStatus = 0x1789,
    #[msg("Insufficient balance")]
    InsufficientBalance = 0x1790,
    #[msg("Insufficient allowance")]
    InsufficientAllowance = 0x1791,
    #[msg("Invalid proof")]
    InvalidProof = 0x1792,
    #[msg("Invalid public inputs")]
    InvalidPublicInputs = 0x1793,
    #[msg("Tree update failed")]
    TreeUpdateFailed = 0x1794,
}

