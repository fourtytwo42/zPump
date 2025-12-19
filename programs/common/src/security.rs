use anchor_lang::prelude::*;
use crate::errors::CommonError;

pub const MIN_SLOTS_BETWEEN_SHIELD: u64 = 10;
pub const MIN_SLOTS_BETWEEN_UNSHIELD: u64 = 10;
pub const MIN_SLOTS_BETWEEN_TRANSFER: u64 = 5;
pub const MAX_OPERATIONS_PER_SLOT: u64 = 100;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OperationType {
    Shield,
    Unshield,
    Transfer,
}

pub fn check_rate_limit(
    last_operation_slot: u64,
    operation_type: OperationType,
    current_slot: u64,
) -> Result<()> {
    let min_slots = match operation_type {
        OperationType::Shield => MIN_SLOTS_BETWEEN_SHIELD,
        OperationType::Unshield => MIN_SLOTS_BETWEEN_UNSHIELD,
        OperationType::Transfer => MIN_SLOTS_BETWEEN_TRANSFER,
    };
    
    require!(
        current_slot >= last_operation_slot + min_slots,
        CommonError::InvalidAmount
    );
    
    Ok(())
}

