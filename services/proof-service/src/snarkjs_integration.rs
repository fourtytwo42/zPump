// Integration with snarkjs for actual proof generation
// This module provides functions to call snarkjs via subprocess

use anyhow::{Context, Result};
use std::path::PathBuf;
use std::process::Command;
use serde_json::json;
use std::fs;
use hex;

pub struct SnarkjsIntegration {
    snarkjs_path: PathBuf,
    circuit_wasm: PathBuf,
    circuit_zkey: PathBuf,
}

impl SnarkjsIntegration {
    pub fn new(
        snarkjs_path: PathBuf,
        circuit_wasm: PathBuf,
        circuit_zkey: PathBuf,
    ) -> Self {
        Self {
            snarkjs_path,
            circuit_wasm,
            circuit_zkey,
        }
    }

    /// Generate proof using snarkjs
    /// 
    /// Steps:
    /// 1. Create input.json with witness data
    /// 2. Call snarkjs to generate witness
    /// 3. Call snarkjs to generate proof
    /// 4. Parse proof and public inputs from output
    pub async fn generate_proof(
        &self,
        witness_data: &serde_json::Value,
    ) -> Result<(Vec<u8>, Vec<u8>)> {
        // Create temporary directory for proof generation
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let temp_dir = std::env::temp_dir().join(format!("proof_gen_{}", timestamp));
        fs::create_dir_all(&temp_dir)
            .context("Failed to create temp directory")?;

        let input_file = temp_dir.join("input.json");
        let witness_file = temp_dir.join("witness.wtns");
        let proof_file = temp_dir.join("proof.json");
        let public_file = temp_dir.join("public.json");

        // Write input.json
        fs::write(&input_file, serde_json::to_string_pretty(&witness_data)?)
            .context("Failed to write input.json")?;

        // Step 1: Generate witness
        // snarkjs command: npx snarkjs wtns calculate circuit.wasm input.json witness.wtns
        // or: node snarkjs.js wtns calculate circuit.wasm input.json witness.wtns
        let mut witness_cmd = if self.snarkjs_path.to_string_lossy() == "npx" || self.snarkjs_path.to_string_lossy().ends_with("npx") {
            // Use npx snarkjs
            let mut cmd = Command::new("npx");
            cmd.arg("snarkjs")
                .arg("wtns")
                .arg("calculate")
                .arg(&self.circuit_wasm)
                .arg(&input_file)
                .arg(&witness_file);
            cmd
        } else if self.snarkjs_path.to_string_lossy().ends_with(".js") {
            let mut cmd = Command::new("node");
            cmd.arg(&self.snarkjs_path)
                .arg("wtns")
                .arg("calculate")
                .arg(&self.circuit_wasm)
                .arg(&input_file)
                .arg(&witness_file);
            cmd
        } else {
            // Assume snarkjs is in PATH
            let mut cmd = Command::new("snarkjs");
            cmd.arg("wtns")
                .arg("calculate")
                .arg(&self.circuit_wasm)
                .arg(&input_file)
                .arg(&witness_file);
            cmd
        };
        
        let witness_output = witness_cmd
            .output()
            .context("Failed to execute snarkjs witness calculation")?;

        if !witness_output.status.success() {
            let error = String::from_utf8_lossy(&witness_output.stderr);
            anyhow::bail!("Witness generation failed: {}", error);
        }

        // Step 2: Generate proof
        // snarkjs command: npx snarkjs groth16 prove circuit.zkey witness.wtns proof.json public.json
        // or: node snarkjs.js groth16 prove circuit.zkey witness.wtns proof.json public.json
        let mut proof_cmd = if self.snarkjs_path.to_string_lossy() == "npx" || self.snarkjs_path.to_string_lossy().ends_with("npx") {
            // Use npx snarkjs
            let mut cmd = Command::new("npx");
            cmd.arg("snarkjs")
                .arg("groth16")
                .arg("prove")
                .arg(&self.circuit_zkey)
                .arg(&witness_file)
                .arg(&proof_file)
                .arg(&public_file);
            cmd
        } else if self.snarkjs_path.to_string_lossy().ends_with(".js") {
            let mut cmd = Command::new("node");
            cmd.arg(&self.snarkjs_path)
                .arg("groth16")
                .arg("prove")
                .arg(&self.circuit_zkey)
                .arg(&witness_file)
                .arg(&proof_file)
                .arg(&public_file);
            cmd
        } else {
            let mut cmd = Command::new("snarkjs");
            cmd.arg("groth16")
                .arg("prove")
                .arg(&self.circuit_zkey)
                .arg(&witness_file)
                .arg(&proof_file)
                .arg(&public_file);
            cmd
        };
        
        let proof_output = proof_cmd
            .output()
            .context("Failed to execute snarkjs proof generation")?;

        if !proof_output.status.success() {
            let error = String::from_utf8_lossy(&proof_output.stderr);
            anyhow::bail!("Proof generation failed: {}", error);
        }

        // Step 3: Parse proof and public inputs
        let proof_json: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(&proof_file)
                .context("Failed to read proof.json")?
        )?;

        let public_json: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(&public_file)
                .context("Failed to read public.json")?
        )?;

        // Extract proof components (a, b, c)
        let proof_a = Self::parse_g1_point(&proof_json["pi_a"])?;
        let proof_b = Self::parse_g2_point(&proof_json["pi_b"])?;
        let proof_c = Self::parse_g1_point(&proof_json["pi_c"])?;

        // Combine into 256-byte proof: a (64) + b (128) + c (64)
        let mut proof = Vec::with_capacity(256);
        proof.extend_from_slice(&proof_a);
        proof.extend_from_slice(&proof_b);
        proof.extend_from_slice(&proof_c);

        // Extract public inputs
        let public_inputs = Self::parse_public_inputs(&public_json)?;

        // Cleanup temp directory
        let _ = fs::remove_dir_all(&temp_dir);

        Ok((proof, public_inputs))
    }

    /// Parse G1 point from snarkjs JSON format
    fn parse_g1_point(point: &serde_json::Value) -> Result<Vec<u8>> {
        // snarkjs format: ["0x...", "0x..."] (x, y coordinates)
        let x_str = point[0].as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid G1 point format"))?;
        let y_str = point[1].as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid G1 point format"))?;
        
        let x_hex = x_str.strip_prefix("0x").unwrap_or(x_str);
        let y_hex = y_str.strip_prefix("0x").unwrap_or(y_str);

        let x_bytes = hex::decode(x_hex)
            .map_err(|e| anyhow::anyhow!("Failed to decode x hex: {}", e))?;
        let y_bytes = hex::decode(y_hex)
            .map_err(|e| anyhow::anyhow!("Failed to decode y hex: {}", e))?;
        
        // G1 point: 64 bytes (32 bytes x + 32 bytes y)
        let mut result = Vec::with_capacity(64);
        
        // Pad x to 32 bytes (little-endian, right-aligned)
        let mut x_padded = vec![0u8; 32];
        let x_len = x_bytes.len().min(32);
        if x_len > 0 {
            x_padded[32 - x_len..].copy_from_slice(&x_bytes[..x_len]);
        }
        result.extend_from_slice(&x_padded);
        
        // Pad y to 32 bytes (little-endian, right-aligned)
        let mut y_padded = vec![0u8; 32];
        let y_len = y_bytes.len().min(32);
        if y_len > 0 {
            y_padded[32 - y_len..].copy_from_slice(&y_bytes[..y_len]);
        }
        result.extend_from_slice(&y_padded);

        Ok(result)
    }

    /// Parse G2 point from snarkjs JSON format
    fn parse_g2_point(point: &serde_json::Value) -> Result<Vec<u8>> {
        // snarkjs format: [["0x...", "0x..."], ["0x...", "0x..."]] (x0, x1, y0, y1)
        let x0_str = point[0][0].as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid G2 point format"))?;
        let x1_str = point[0][1].as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid G2 point format"))?;
        let y0_str = point[1][0].as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid G2 point format"))?;
        let y1_str = point[1][1].as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid G2 point format"))?;
        
        let x0_hex = x0_str.strip_prefix("0x").unwrap_or(x0_str);
        let x1_hex = x1_str.strip_prefix("0x").unwrap_or(x1_str);
        let y0_hex = y0_str.strip_prefix("0x").unwrap_or(y0_str);
        let y1_hex = y1_str.strip_prefix("0x").unwrap_or(y1_str);

        let x0_bytes = hex::decode(x0_hex)
            .map_err(|e| anyhow::anyhow!("Failed to decode x0 hex: {}", e))?;
        let x1_bytes = hex::decode(x1_hex)
            .map_err(|e| anyhow::anyhow!("Failed to decode x1 hex: {}", e))?;
        let y0_bytes = hex::decode(y0_hex)
            .map_err(|e| anyhow::anyhow!("Failed to decode y0 hex: {}", e))?;
        let y1_bytes = hex::decode(y1_hex)
            .map_err(|e| anyhow::anyhow!("Failed to decode y1 hex: {}", e))?;
        
        // G2 point: 128 bytes (32 bytes each for x0, x1, y0, y1)
        let mut result = Vec::with_capacity(128);
        
        // Pad each component to 32 bytes (little-endian, right-aligned)
        let components = [&x0_bytes, &x1_bytes, &y0_bytes, &y1_bytes];
        for bytes in components.iter() {
            let mut padded = vec![0u8; 32];
            let len = bytes.len().min(32);
            if len > 0 {
                padded[32 - len..].copy_from_slice(&bytes[..len]);
            }
            result.extend_from_slice(&padded);
        }

        Ok(result)
    }

    /// Parse public inputs from snarkjs JSON format
    fn parse_public_inputs(public: &serde_json::Value) -> Result<Vec<u8>> {
        // snarkjs format: ["0x...", "0x...", ...]
        let mut result = Vec::new();
        
        if let Some(array) = public.as_array() {
            for value in array {
                if let Some(hex_str) = value.as_str() {
                    let hex_val = hex_str.strip_prefix("0x").unwrap_or(hex_str);
                    let bytes = hex::decode(hex_val)
                        .map_err(|e| anyhow::anyhow!("Failed to decode public input hex: {}", e))?;
                    // Pad to 32 bytes (little-endian, right-aligned)
                    let mut padded = vec![0u8; 32];
                    let copy_len = bytes.len().min(32);
                    if copy_len > 0 {
                        padded[32 - copy_len..].copy_from_slice(&bytes[..copy_len]);
                    }
                    result.extend_from_slice(&padded);
                }
            }
        }

        Ok(result)
    }
}

