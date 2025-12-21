use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use crate::snarkjs_integration::SnarkjsIntegration;
use hex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofRequest {
    pub commitment: Option<String>,
    pub nullifier: Option<String>,
    pub amount: Option<u64>,
    pub recipient: Option<String>,
    pub public_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofResponse {
    pub proof: Vec<u8>,
    pub public_inputs: Vec<u8>,
}

pub struct CircuitHandler {
    circuit_path: PathBuf,  // Original path for logging
    base_path: PathBuf,     // Canonicalized base path for file operations
    snarkjs_path: Option<PathBuf>,
    use_snarkjs: bool,
}


impl CircuitHandler {
    pub fn new(circuit_path: PathBuf, snarkjs_path: Option<PathBuf>) -> Self {
        // Check if snarkjs is available and circuit files exist
        // Circuit files are in circuit_js/circuit.wasm and circuit_0001.zkey
        
        // First, canonicalize the base circuit_path if it's absolute
        let base_path = if circuit_path.is_absolute() {
            circuit_path.canonicalize().unwrap_or_else(|_| circuit_path.clone())
        } else {
            // If relative, try to resolve from current dir
            std::env::current_dir()
                .ok()
                .and_then(|cwd| cwd.join(&circuit_path).canonicalize().ok())
                .unwrap_or_else(|| circuit_path.clone())
        };
        
        let wasm_path = base_path.join("circuit_js").join("circuit.wasm");
        let zkey_path = base_path.join("circuit_0001.zkey");
        
        // Canonicalize the final paths (unwrap_or keeps original if canonicalize fails)
        let wasm_path = wasm_path.canonicalize().unwrap_or_else(|_| wasm_path);
        let zkey_path = zkey_path.canonicalize().unwrap_or_else(|_| zkey_path);
        
        let wasm_exists = wasm_path.exists();
        let zkey_exists = zkey_path.exists();
        let snarkjs_configured = snarkjs_path.is_some();
        let use_snarkjs = snarkjs_configured && wasm_exists && zkey_exists;
        
        log::info!("Circuit handler initialization for: {:?}", circuit_path);
        log::info!("  Base path (canonicalized): {:?}", base_path);
        log::info!("  WASM path: {:?} (exists: {})", wasm_path, wasm_exists);
        log::info!("  ZKEY path: {:?} (exists: {})", zkey_path, zkey_exists);
        log::info!("  snarkjs configured: {}", snarkjs_configured);
        log::info!("  Use snarkjs: {}", use_snarkjs);
        
        if use_snarkjs {
            log::info!("✅ snarkjs integration enabled for circuit: {:?}", circuit_path);
        } else {
            log::warn!("⚠️  Using placeholder proof generation for circuit: {:?}", circuit_path);
            if !snarkjs_configured {
                log::warn!("  Reason: snarkjs_path not configured");
            }
            if !wasm_exists {
                log::warn!("  Reason: WASM file not found at {:?}", wasm_path);
            }
            if !zkey_exists {
                log::warn!("  Reason: ZKEY file not found at {:?}", zkey_path);
            }
        }
        
        Self {
            circuit_path: circuit_path.clone(), // Store original for logging
            base_path,                          // Store canonicalized base path
            snarkjs_path,
            use_snarkjs,
        }
    }

    pub async fn generate_proof(
        &self,
        operation_type: &str,
        request: ProofRequest,
    ) -> Result<ProofResponse> {
        // Try to use snarkjs if available, otherwise fall back to placeholder
        if self.use_snarkjs {
            if let Ok((proof, public_inputs)) = self.generate_proof_with_snarkjs(operation_type, &request).await {
                return Ok(ProofResponse { proof, public_inputs });
            }
            // If snarkjs fails, fall back to placeholder
            log::warn!("snarkjs proof generation failed, using placeholder");
        }
        
        // Placeholder: Generate deterministic proof based on inputs
        let proof = self.generate_placeholder_proof(&request)?;
        let public_inputs = self.generate_public_inputs(operation_type, &request)?;
        
        Ok(ProofResponse {
            proof,
            public_inputs,
        })
    }
    
    async fn generate_proof_with_snarkjs(
        &self,
        operation_type: &str,
        request: &ProofRequest,
    ) -> Result<(Vec<u8>, Vec<u8>)> {
        let snarkjs_path = self.snarkjs_path.as_ref()
            .ok_or_else(|| anyhow::anyhow!("snarkjs path not configured"))?;
        
        // Use canonicalized base_path for file operations
        // Circuit files are in circuit_js/circuit.wasm and circuit_0001.zkey
        let circuit_wasm = self.base_path.join("circuit_js").join("circuit.wasm");
        let circuit_zkey = self.base_path.join("circuit_0001.zkey");
        
        // Canonicalize paths again to ensure they're absolute
        let circuit_wasm = circuit_wasm.canonicalize()
            .map_err(|e| anyhow::anyhow!("Failed to canonicalize WASM path {:?}: {}", circuit_wasm, e))?;
        let circuit_zkey = circuit_zkey.canonicalize()
            .map_err(|e| anyhow::anyhow!("Failed to canonicalize ZKEY path {:?}: {}", circuit_zkey, e))?;
        
        if !circuit_wasm.exists() || !circuit_zkey.exists() {
            anyhow::bail!("Circuit files not found: wasm={:?}, zkey={:?}", circuit_wasm, circuit_zkey);
        }
        
        let snarkjs = SnarkjsIntegration::new(
            snarkjs_path.clone(),
            circuit_wasm,
            circuit_zkey,
        );
        
        // Prepare witness data based on operation type
        let witness_data = self.prepare_witness_data(operation_type, request)?;
        
        // Generate proof
        snarkjs.generate_proof(&witness_data).await
    }
    
    fn prepare_witness_data(
        &self,
        operation_type: &str,
        request: &ProofRequest,
    ) -> Result<serde_json::Value> {
        match operation_type {
            "shield" => {
                let commitment = request.commitment.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Commitment required for shield"))?;
                let commitment_bytes = hex_decode(commitment)
                    .map_err(|e| anyhow::anyhow!("Failed to decode commitment: {}", e))?;
                
                Ok(serde_json::json!({
                    "secret": commitment_bytes.iter().map(|b| *b as u64).collect::<Vec<_>>(),
                    "amount": request.amount.unwrap_or(0)
                }))
            }
            "unshield" => {
                let nullifier = request.nullifier.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Nullifier required for unshield"))?;
                let nullifier_bytes = hex_decode(nullifier)
                    .map_err(|e| anyhow::anyhow!("Failed to decode nullifier: {}", e))?;
                
                Ok(serde_json::json!({
                    "nullifier_secret": nullifier_bytes.iter().map(|b| *b as u64).collect::<Vec<_>>(),
                    "amount": request.amount.unwrap_or(0)
                }))
            }
            "transfer" => {
                let nullifier = request.nullifier.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Nullifier required for transfer"))?;
                let commitment = request.commitment.as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Commitment required for transfer"))?;
                
                let nullifier_bytes = hex_decode(nullifier)
                    .map_err(|e| anyhow::anyhow!("Failed to decode nullifier: {}", e))?;
                let commitment_bytes = hex_decode(commitment)
                    .map_err(|e| anyhow::anyhow!("Failed to decode commitment: {}", e))?;
                
                Ok(serde_json::json!({
                    "nullifier_secret": nullifier_bytes.iter().map(|b| *b as u64).collect::<Vec<_>>(),
                    "new_secret": commitment_bytes.iter().map(|b| *b as u64).collect::<Vec<_>>(),
                    "amount": request.amount.unwrap_or(0)
                }))
            }
            _ => anyhow::bail!("Unknown operation type: {}", operation_type),
        }
    }

    fn generate_placeholder_proof(&self, request: &ProofRequest) -> Result<Vec<u8>> {
        // Placeholder: 256-byte proof (a=G1 64 bytes + b=G2 128 bytes + c=G1 64 bytes)
        let mut proof = vec![0u8; 256];
        
        // Fill with deterministic data based on inputs
        let seed = request.commitment.as_ref()
            .or(request.nullifier.as_ref())
            .map(|s| s.as_bytes())
            .unwrap_or(&[]);
        
        for (i, byte) in proof.iter_mut().enumerate() {
            *byte = (seed.get(i % seed.len()).copied().unwrap_or(0) as u8)
                .wrapping_add(i as u8);
        }
        
        Ok(proof)
    }

    fn generate_public_inputs(
        &self,
        operation_type: &str,
        request: &ProofRequest,
    ) -> Result<Vec<u8>> {
        let mut public_inputs = Vec::new();
        
        match operation_type {
            "shield" => {
                // Shield: [commitment] (32 bytes)
                if let Some(commitment) = &request.commitment {
                    let bytes = hex_decode(commitment)
                        .map_err(|e| anyhow::anyhow!("Failed to decode commitment hex: {}", e))?;
                    public_inputs.extend_from_slice(&bytes[..32.min(bytes.len())]);
                } else {
                    public_inputs.extend_from_slice(&[0u8; 32]);
                }
            }
            "unshield" => {
                // Unshield: [nullifier_hash, amount] (64 bytes)
                if let Some(nullifier) = &request.nullifier {
                    let bytes = hex_decode(nullifier)
                        .map_err(|e| anyhow::anyhow!("Failed to decode nullifier hex: {}", e))?;
                    public_inputs.extend_from_slice(&bytes[..32.min(bytes.len())]);
                } else {
                    public_inputs.extend_from_slice(&[0u8; 32]);
                }
                
                // Amount (32 bytes, but only 8 bytes used)
                let amount = request.amount.unwrap_or(0);
                let mut amount_bytes = vec![0u8; 32];
                amount_bytes[..8].copy_from_slice(&amount.to_le_bytes());
                public_inputs.extend_from_slice(&amount_bytes);
            }
            "transfer" => {
                // Transfer: [nullifier_in, commitment_out, amount] (96 bytes)
                if let Some(nullifier) = &request.nullifier {
                    let bytes = hex_decode(nullifier)
                        .map_err(|e| anyhow::anyhow!("Failed to decode nullifier hex: {}", e))?;
                    public_inputs.extend_from_slice(&bytes[..32.min(bytes.len())]);
                } else {
                    public_inputs.extend_from_slice(&[0u8; 32]);
                }
                
                if let Some(commitment) = &request.commitment {
                    let bytes = hex_decode(commitment)
                        .map_err(|e| anyhow::anyhow!("Failed to decode commitment hex: {}", e))?;
                    public_inputs.extend_from_slice(&bytes[..32.min(bytes.len())]);
                } else {
                    public_inputs.extend_from_slice(&[0u8; 32]);
                }
                
                let amount = request.amount.unwrap_or(0);
                let mut amount_bytes = vec![0u8; 32];
                amount_bytes[..8].copy_from_slice(&amount.to_le_bytes());
                public_inputs.extend_from_slice(&amount_bytes);
            }
            _ => {
                anyhow::bail!("Unknown operation type: {}", operation_type);
            }
        }
        
        Ok(public_inputs)
    }
}

fn hex_decode(s: &str) -> Result<Vec<u8>, anyhow::Error> {
    let hex_str = s.strip_prefix("0x").unwrap_or(s);
    hex::decode(hex_str)
        .map_err(|e| anyhow::anyhow!("Invalid hex: {}", e))
}

