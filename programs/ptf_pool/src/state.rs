use anchor_lang::prelude::*;

pub const DEPTH: usize = 32;
pub const MAX_CANOPY: usize = 128;

#[account]
pub struct PoolState {
    pub current_root: [u8; 32],
    pub recent_roots: [[u8; 32]; 16],
    pub recent_roots_len: u8,
    pub origin_mint: Pubkey,
    pub vault: Pubkey,
    pub twin_mint: Option<Pubkey>,
    pub verifying_key: Pubkey,
    pub verifying_key_hash: [u8; 32],
    pub last_operation_slot: u64,
    pub operation_count: u64,
    pub bump: u8,
}

impl PoolState {
    pub const LEN: usize = 8 + 32 + (16 * 32) + 1 + 32 + 32 + 33 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct CommitmentTree {
    pub pool: Pubkey,
    pub canopy_depth: u8,
    pub next_index: u64,
    pub current_root: [u8; 32],
    pub frontier: [[u8; 32]; DEPTH],
    pub zeroes: [[u8; 32]; DEPTH],
    pub canopy: [[u8; 32]; MAX_CANOPY],
    pub recent_commitments: [[u8; 32]; MAX_CANOPY],
    pub recent_amount_commitments: [[u8; 32]; MAX_CANOPY],
    pub recent_indices: [u64; MAX_CANOPY],
    pub recent_len: u8,
    pub bump: u8,
}

impl CommitmentTree {
    pub const LEN: usize = 8 + 32 + 1 + 8 + 32 + (DEPTH * 32) + (DEPTH * 32) + (MAX_CANOPY * 32) + (MAX_CANOPY * 32) + (MAX_CANOPY * 32) + (MAX_CANOPY * 8) + 1 + 1;
}

#[account]
pub struct NullifierSet {
    pub pool: Pubkey,
    pub nullifiers: Vec<[u8; 32]>,
    pub bump: u8,
}

impl NullifierSet {
    pub const MIN_LEN: usize = 8 + 32 + 4 + 1;
}

#[account]
pub struct NoteLedger {
    pub pool: Pubkey,
    pub notes: Vec<[u8; 32]>,
    pub bump: u8,
}

impl NoteLedger {
    pub const MIN_LEN: usize = 8 + 32 + 4 + 1; // discriminator + pool + Vec length + bump
}

#[account]
pub struct UserProofVault {
    pub prepared_operations: Vec<PreparedOperation>,
}

impl UserProofVault {
    pub const MIN_LEN: usize = 8 + 4; // discriminator + Vec length
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct PreparedOperation {
    pub id: [u8; 32],
    pub status: u8, // OperationStatus as u8
    pub operation_type: u8,
    pub data: Vec<u8>,
}

impl PreparedOperation {
    pub fn id(&self) -> &[u8; 32] {
        &self.id
    }
    
    pub fn status(&self) -> ptf_common::OperationStatus {
        ptf_common::OperationStatus::from_u8(self.status)
            .unwrap_or(ptf_common::OperationStatus::Failed)
    }
    
    pub fn set_status(&mut self, status: ptf_common::OperationStatus) {
        self.status = status as u8;
    }
}

#[account]
pub struct ShieldClaim {
    pub pool: Pubkey,
    pub claimer: Pubkey,
    pub amount: u64,
    pub commitment: [u8; 32],
    pub bump: u8,
}

impl ShieldClaim {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 32 + 1;
}

