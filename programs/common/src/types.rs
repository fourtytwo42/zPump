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
pub const MAX_BATCH_SIZE: usize = 10;

