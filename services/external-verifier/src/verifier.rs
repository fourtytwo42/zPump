// Groth16 verifier using snarkjs (proven, reliable)

use anyhow::{Context, Result};
use std::path::PathBuf;
use std::process::Command;
use std::fs;
use serde_json::json;
use log::{info, error};
use tempfile::TempDir;
use num_bigint::BigUint;

#[derive(Debug)]
pub struct Groth16Verifier {
    snarkjs_path: PathBuf,
}

impl Groth16Verifier {
    pub fn new() -> Self {
        // Use npx snarkjs by default
        Self {
            snarkjs_path: PathBuf::from("npx"),
        }
    }
    
    /// Verify a Groth16 proof using snarkjs
    /// 
    /// Args:
    /// - proof: 256 bytes (a=64, b=128, c=64)
    /// - public_inputs: Variable length
    /// - verifying_key: Binary format (we'll convert to JSON for snarkjs)
    pub fn verify(
        &self,
        proof: &[u8],
        public_inputs: &[u8],
        verifying_key: &[u8],
    ) -> Result<bool> {
        info!("Verifying Groth16 proof using snarkjs");
        
        // Create temporary directory for verification files
        let temp_dir = TempDir::new()
            .context("Failed to create temp directory")?;
        
        // Convert binary verifying key to JSON format for snarkjs
        // We need to parse the binary format and create JSON
        let vk_json = self.binary_to_json_verifying_key(verifying_key)?;
        let vk_file = temp_dir.path().join("verification_key.json");
        fs::write(&vk_file, serde_json::to_string_pretty(&vk_json)?)
            .context("Failed to write verification key")?;
        
        // Write public inputs as JSON array
        let public_inputs_json = self.bytes_to_json_public_inputs(public_inputs)?;
        let public_file = temp_dir.path().join("public.json");
        fs::write(&public_file, serde_json::to_string(&public_inputs_json)?)
            .context("Failed to write public inputs")?;
        
        // Write proof as JSON
        let proof_json = self.bytes_to_json_proof(proof)?;
        let proof_file = temp_dir.path().join("proof.json");
        fs::write(&proof_file, serde_json::to_string_pretty(&proof_json)?)
            .context("Failed to write proof")?;
        
        // Call snarkjs groth16 verify
        let output = if self.snarkjs_path.to_string_lossy() == "npx" {
            Command::new("npx")
                .arg("snarkjs")
                .arg("groth16")
                .arg("verify")
                .arg(&vk_file)
                .arg(&public_file)
                .arg(&proof_file)
                .current_dir(temp_dir.path())
                .output()
        } else {
            Command::new(&self.snarkjs_path)
                .arg("groth16")
                .arg("verify")
                .arg(&vk_file)
                .arg(&public_file)
                .arg(&proof_file)
                .current_dir(temp_dir.path())
                .output()
        }
        .context("Failed to execute snarkjs")?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("snarkjs verification failed: {}", stderr);
            return Ok(false);
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        info!("snarkjs output: {}", stdout);
        
        // snarkjs returns OK (exit code 0) if verification succeeds
        Ok(true)
    }
    
    /// Convert binary verifying key to JSON format for snarkjs
    /// 
    /// Note: This is a simplified conversion. For production, you should:
    /// 1. Store JSON verification keys alongside binary ones, OR
    /// 2. Use a proper library to convert between formats
    /// 
    /// For now, this attempts to convert but may need adjustment based on
    /// the actual point encoding format used.
    fn binary_to_json_verifying_key(&self, data: &[u8]) -> Result<serde_json::Value> {
        // Parse binary format: [alpha (64)][beta (128)][gamma (128)][delta (128)][gamma_abc_count (4)][gamma_abc... (64 each)]
        
        if data.len() < 64 + 128 + 128 + 128 + 4 {
            anyhow::bail!("Verifying key too short");
        }
        
        let mut offset = 0;
        
        // Parse alpha (G1, 64 bytes) - convert to decimal strings for JSON
        // G1 point format: [x (32 bytes), y (32 bytes)]
        let alpha_x = &data[offset..offset + 32];
        let alpha_y = &data[offset + 32..offset + 64];
        let alpha_x_dec = bytes_to_decimal(alpha_x);
        let alpha_y_dec = bytes_to_decimal(alpha_y);
        offset += 64;
        
        // Parse beta (G2, 128 bytes) - format: [x0 (32), x1 (32), y0 (32), y1 (32)]
        let beta_x0 = bytes_to_decimal(&data[offset..offset + 32]);
        let beta_x1 = bytes_to_decimal(&data[offset + 32..offset + 64]);
        let beta_y0 = bytes_to_decimal(&data[offset + 64..offset + 96]);
        let beta_y1 = bytes_to_decimal(&data[offset + 96..offset + 128]);
        offset += 128;
        
        // Parse gamma (G2, 128 bytes)
        let gamma_x0 = bytes_to_decimal(&data[offset..offset + 32]);
        let gamma_x1 = bytes_to_decimal(&data[offset + 32..offset + 64]);
        let gamma_y0 = bytes_to_decimal(&data[offset + 64..offset + 96]);
        let gamma_y1 = bytes_to_decimal(&data[offset + 96..offset + 128]);
        offset += 128;
        
        // Parse delta (G2, 128 bytes)
        let delta_x0 = bytes_to_decimal(&data[offset..offset + 32]);
        let delta_x1 = bytes_to_decimal(&data[offset + 32..offset + 64]);
        let delta_y0 = bytes_to_decimal(&data[offset + 64..offset + 96]);
        let delta_y1 = bytes_to_decimal(&data[offset + 96..offset + 128]);
        offset += 128;
        
        // Parse gamma_abc count
        let gamma_abc_count = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;
        offset += 4;
        
        // Parse gamma_abc points (G1, 64 bytes each)
        let mut gamma_abc = Vec::new();
        for i in 0..gamma_abc_count {
            if data.len() < offset + 64 {
                anyhow::bail!("Incomplete gamma_abc data at index {}", i);
            }
            let ic_x = bytes_to_decimal(&data[offset..offset + 32]);
            let ic_y = bytes_to_decimal(&data[offset + 32..offset + 64]);
            gamma_abc.push(json!([ic_x, ic_y, "1"]));
            offset += 64;
        }
        
        // Create JSON structure matching snarkjs format
        Ok(json!({
            "protocol": "groth16",
            "curve": "bn128",
            "nPublic": gamma_abc_count,
            "vk_alpha_1": [alpha_x_dec, alpha_y_dec, "1"],
            "vk_beta_2": [[beta_x0, beta_x1], [beta_y0, beta_y1], ["1", "0"]],
            "vk_gamma_2": [[gamma_x0, gamma_x1], [gamma_y0, gamma_y1], ["1", "0"]],
            "vk_delta_2": [[delta_x0, delta_x1], [delta_y0, delta_y1], ["1", "0"]],
            "vk_alphabeta_12": [],
            "IC": gamma_abc
        }))
    }
    
    /// Convert proof bytes to JSON format for snarkjs
    fn bytes_to_json_proof(&self, data: &[u8]) -> Result<serde_json::Value> {
        if data.len() != 256 {
            anyhow::bail!("Proof must be 256 bytes");
        }
        
        // Parse a (G1, 64 bytes): [x (32), y (32)]
        let a_x = bytes_to_decimal(&data[0..32]);
        let a_y = bytes_to_decimal(&data[32..64]);
        
        // Parse b (G2, 128 bytes): [x0 (32), x1 (32), y0 (32), y1 (32)]
        let b_x0 = bytes_to_decimal(&data[64..96]);
        let b_x1 = bytes_to_decimal(&data[96..128]);
        let b_y0 = bytes_to_decimal(&data[128..160]);
        let b_y1 = bytes_to_decimal(&data[160..192]);
        
        // Parse c (G1, 64 bytes): [x (32), y (32)]
        let c_x = bytes_to_decimal(&data[192..224]);
        let c_y = bytes_to_decimal(&data[224..256]);
        
        // snarkjs expects: { pi_a: [x, y, "1"], pi_b: [[x0, x1], [y0, y1], ["1", "0"]], pi_c: [x, y, "1"] }
        Ok(json!({
            "pi_a": [a_x, a_y, "1"],
            "pi_b": [[b_x0, b_x1], [b_y0, b_y1], ["1", "0"]],
            "pi_c": [c_x, c_y, "1"]
        }))
    }
    
    /// Convert public inputs bytes to JSON array for snarkjs
    fn bytes_to_json_public_inputs(&self, data: &[u8]) -> Result<Vec<String>> {
        if data.len() % 32 != 0 {
            anyhow::bail!("Public inputs must be multiple of 32 bytes");
        }
        
        let num_inputs = data.len() / 32;
        let mut inputs = Vec::new();
        
        for i in 0..num_inputs {
            let offset = i * 32;
            let input_decimal = bytes_to_decimal(&data[offset..offset + 32]);
            inputs.push(input_decimal);
        }
        
        Ok(inputs)
    }
}

/// Convert bytes to decimal string (big-endian interpretation)
fn bytes_to_decimal(bytes: &[u8]) -> String {
    // Convert bytes to big integer, then to decimal string
    let value = BigUint::from_bytes_be(bytes);
    value.to_string()
}

