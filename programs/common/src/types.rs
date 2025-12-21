use anchor_lang::prelude::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OperationStatus {
    Pending = 0,
    InProgress = 1,
    Verified = 2,
    Updated = 3,
    Completed = 4,
    Failed = 5,
}

impl OperationStatus {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(OperationStatus::Pending),
            1 => Some(OperationStatus::InProgress),
            2 => Some(OperationStatus::Verified),
            3 => Some(OperationStatus::Updated),
            4 => Some(OperationStatus::Completed),
            5 => Some(OperationStatus::Failed),
            _ => None,
        }
    }
}

pub struct PreparedOperation {
    pub id: [u8; 32],
    pub status: OperationStatus,
}

impl PreparedOperation {
    pub fn id(&self) -> &[u8; 32] {
        &self.id
    }
    
    pub fn status(&self) -> OperationStatus {
        self.status
    }
    
    pub fn set_status(&mut self, status: OperationStatus) {
        self.status = status;
    }
}

// Constants for validation
pub const MIN_AMOUNT: u64 = 1;
pub const MAX_AMOUNT: u64 = u64::MAX;
pub const MAX_PROOF_SIZE: usize = 1024;
pub const MIN_PROOF_SIZE: usize = 64;
pub const MAX_PUBLIC_INPUTS_SIZE: usize = 512;
pub const MAX_SHIELD_AMOUNT: u64 = u64::MAX;
pub const MAX_UNSHIELD_AMOUNT: u64 = u64::MAX;
pub const MAX_TRANSFER_AMOUNT: u64 = u64::MAX;
// Reduced from 10 to 3 to ensure batch operations fit within 1.4M CU
// With real Groth16 verification: ~200,000-400,000 CU per proof
// 3 proofs: ~600,000-1,200,000 CU (within 1.4M limit)
// 10 proofs: ~2,000,000-4,000,000 CU (exceeds limit)
pub const MAX_BATCH_SIZE: usize = 3; // Conservative limit

