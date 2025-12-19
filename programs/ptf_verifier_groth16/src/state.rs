use anchor_lang::prelude::*;

#[account]
pub struct VerifyingKeyAccount {
    pub circuit_tag: [u8; 32],
    pub version: u32,
    pub key_data: Vec<u8>,
    pub revoked: bool,
    pub authority: Pubkey,
}

impl VerifyingKeyAccount {
    // Base size: discriminator (8) + circuit_tag (32) + version (4) + Vec length (4) + Vec data (variable) + revoked (1) + authority (32)
    // Minimum size assumes empty key_data
    pub const MIN_LEN: usize = 8 + 32 + 4 + 4 + 0 + 1 + 32;
}

