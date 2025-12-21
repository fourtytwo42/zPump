// Attestation creation and verification

use ed25519_dalek::{SigningKey, Signature, Signer};
use sha2::{Sha256, Digest};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct VerificationAttestation {
    pub proof_hash: [u8; 32],
    pub public_inputs_hash: [u8; 32],
    pub verifying_key_hash: [u8; 32],
    pub is_valid: bool,
    pub timestamp: i64,
    pub signature: [u8; 64],  // Ed25519 signature
}

impl Serialize for VerificationAttestation {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("VerificationAttestation", 6)?;
        state.serialize_field("proof_hash", &hex::encode(self.proof_hash))?;
        state.serialize_field("public_inputs_hash", &hex::encode(self.public_inputs_hash))?;
        state.serialize_field("verifying_key_hash", &hex::encode(self.verifying_key_hash))?;
        state.serialize_field("is_valid", &self.is_valid)?;
        state.serialize_field("timestamp", &self.timestamp)?;
        state.serialize_field("signature", &hex::encode(self.signature))?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for VerificationAttestation {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{self, Visitor};
        use std::fmt;
        
        struct VerificationAttestationVisitor;
        
        impl<'de> Visitor<'de> for VerificationAttestationVisitor {
            type Value = VerificationAttestation;
            
            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("struct VerificationAttestation")
            }
            
            fn visit_map<V>(self, mut map: V) -> Result<VerificationAttestation, V::Error>
            where
                V: de::MapAccess<'de>,
            {
                let mut proof_hash = None;
                let mut public_inputs_hash = None;
                let mut verifying_key_hash = None;
                let mut is_valid = None;
                let mut timestamp = None;
                let mut signature = None;
                
                while let Some(key) = map.next_key()? {
                    match key {
                        "proof_hash" => {
                            let hex_str: String = map.next_value()?;
                            let bytes = hex::decode(hex_str).map_err(de::Error::custom)?;
                            if bytes.len() != 32 {
                                return Err(de::Error::invalid_length(bytes.len(), &"32"));
                            }
                            let mut arr = [0u8; 32];
                            arr.copy_from_slice(&bytes);
                            proof_hash = Some(arr);
                        }
                        "public_inputs_hash" => {
                            let hex_str: String = map.next_value()?;
                            let bytes = hex::decode(hex_str).map_err(de::Error::custom)?;
                            if bytes.len() != 32 {
                                return Err(de::Error::invalid_length(bytes.len(), &"32"));
                            }
                            let mut arr = [0u8; 32];
                            arr.copy_from_slice(&bytes);
                            public_inputs_hash = Some(arr);
                        }
                        "verifying_key_hash" => {
                            let hex_str: String = map.next_value()?;
                            let bytes = hex::decode(hex_str).map_err(de::Error::custom)?;
                            if bytes.len() != 32 {
                                return Err(de::Error::invalid_length(bytes.len(), &"32"));
                            }
                            let mut arr = [0u8; 32];
                            arr.copy_from_slice(&bytes);
                            verifying_key_hash = Some(arr);
                        }
                        "is_valid" => {
                            is_valid = Some(map.next_value()?);
                        }
                        "timestamp" => {
                            timestamp = Some(map.next_value()?);
                        }
                        "signature" => {
                            let hex_str: String = map.next_value()?;
                            let bytes = hex::decode(hex_str).map_err(de::Error::custom)?;
                            if bytes.len() != 64 {
                                return Err(de::Error::invalid_length(bytes.len(), &"64"));
                            }
                            let mut arr = [0u8; 64];
                            arr.copy_from_slice(&bytes);
                            signature = Some(arr);
                        }
                        _ => {
                            let _ = map.next_value::<de::IgnoredAny>()?;
                        }
                    }
                }
                
                Ok(VerificationAttestation {
                    proof_hash: proof_hash.ok_or_else(|| de::Error::missing_field("proof_hash"))?,
                    public_inputs_hash: public_inputs_hash.ok_or_else(|| de::Error::missing_field("public_inputs_hash"))?,
                    verifying_key_hash: verifying_key_hash.ok_or_else(|| de::Error::missing_field("verifying_key_hash"))?,
                    is_valid: is_valid.ok_or_else(|| de::Error::missing_field("is_valid"))?,
                    timestamp: timestamp.ok_or_else(|| de::Error::missing_field("timestamp"))?,
                    signature: signature.ok_or_else(|| de::Error::missing_field("signature"))?,
                })
            }
        }
        
        deserializer.deserialize_struct("VerificationAttestation", &["proof_hash", "public_inputs_hash", "verifying_key_hash", "is_valid", "timestamp", "signature"], VerificationAttestationVisitor)
    }
}

impl VerificationAttestation {
    /// Verify the attestation signature
    pub fn verify_signature(&self, verifying_key: &ed25519_dalek::VerifyingKey) -> bool {
        let message = self.message_to_sign();
        let signature = Signature::from_bytes(&self.signature);
        verifying_key.verify_strict(&message, &signature).is_ok()
    }
    
    /// Get the message that was signed
    fn message_to_sign(&self) -> Vec<u8> {
        let mut message = Vec::new();
        message.extend_from_slice(&self.proof_hash);
        message.extend_from_slice(&self.public_inputs_hash);
        message.extend_from_slice(&self.verifying_key_hash);
        message.push(if self.is_valid { 1 } else { 0 });
        message.extend_from_slice(&self.timestamp.to_le_bytes());
        message
    }
    
    /// Verify hashes match the provided data
    pub fn verify_hashes(&self, proof: &[u8], public_inputs: &[u8], verifying_key: &[u8]) -> bool {
        let proof_hash = hash_data(proof);
        let public_inputs_hash = hash_data(public_inputs);
        let verifying_key_hash = hash_data(verifying_key);
        
        proof_hash == self.proof_hash
            && public_inputs_hash == self.public_inputs_hash
            && verifying_key_hash == self.verifying_key_hash
    }
    
    /// Check if attestation is recent (within 5 minutes)
    pub fn is_recent(&self) -> bool {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        let age = now - self.timestamp;
        age >= 0 && age <= 300 // 5 minutes
    }
}

/// Create an attestation for a verification result
pub fn create_attestation(
    proof: &[u8],
    public_inputs: &[u8],
    verifying_key: &[u8],
    is_valid: bool,
    signing_key: &SigningKey,
) -> VerificationAttestation {
    let proof_hash = hash_data(proof);
    let public_inputs_hash = hash_data(public_inputs);
    let verifying_key_hash = hash_data(verifying_key);
    
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    // Create message to sign
    let mut message = Vec::new();
    message.extend_from_slice(&proof_hash);
    message.extend_from_slice(&public_inputs_hash);
    message.extend_from_slice(&verifying_key_hash);
    message.push(if is_valid { 1 } else { 0 });
    message.extend_from_slice(&timestamp.to_le_bytes());
    
    // Sign message
    let signature = signing_key.sign(&message);
    
    VerificationAttestation {
        proof_hash,
        public_inputs_hash,
        verifying_key_hash,
        is_valid,
        timestamp,
        signature: signature.to_bytes(),
    }
}

fn hash_data(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

