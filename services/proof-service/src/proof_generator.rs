use crate::circuit_handler::{CircuitHandler, ProofRequest, ProofResponse};
use anyhow::Result;
use std::path::PathBuf;
use hex;

pub struct ProofGenerator {
    shield_handler: CircuitHandler,
    unshield_handler: CircuitHandler,
    transfer_handler: CircuitHandler,
}

impl ProofGenerator {
    pub fn new(
        shield_path: PathBuf,
        unshield_path: PathBuf,
        transfer_path: PathBuf,
        snarkjs_path: Option<PathBuf>,
    ) -> Self {
        Self {
            shield_handler: CircuitHandler::new(shield_path, snarkjs_path.clone()),
            unshield_handler: CircuitHandler::new(unshield_path, snarkjs_path.clone()),
            transfer_handler: CircuitHandler::new(transfer_path, snarkjs_path),
        }
    }

    pub async fn generate_shield_proof(
        &self,
        commitment: &[u8],
        amount: u64,
    ) -> Result<ProofResponse> {
        let request = ProofRequest {
            commitment: Some(hex::encode(commitment)),
            nullifier: None,
            amount: Some(amount),
            recipient: None,
            public_key: None,
        };
        
        self.shield_handler.generate_proof("shield", request).await
    }

    pub async fn generate_unshield_proof(
        &self,
        nullifier: &[u8],
        amount: u64,
        recipient: Option<&[u8]>,
    ) -> Result<ProofResponse> {
        let request = ProofRequest {
            commitment: None,
            nullifier: Some(hex::encode(nullifier)),
            amount: Some(amount),
            recipient: recipient.map(hex::encode),
            public_key: None,
        };
        
        self.unshield_handler.generate_proof("unshield", request).await
    }

    pub async fn generate_transfer_proof(
        &self,
        nullifier: &[u8],
        commitment: &[u8],
        amount: u64,
    ) -> Result<ProofResponse> {
        let request = ProofRequest {
            commitment: Some(hex::encode(commitment)),
            nullifier: Some(hex::encode(nullifier)),
            amount: Some(amount),
            recipient: None,
            public_key: None,
        };
        
        self.transfer_handler.generate_proof("transfer", request).await
    }
}

