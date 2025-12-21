use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub circuits: CircuitConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitConfig {
    pub shield_circuit_path: PathBuf,
    pub unshield_circuit_path: PathBuf,
    pub transfer_circuit_path: PathBuf,
    pub snarkjs_path: Option<PathBuf>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 8080,
            },
            circuits: CircuitConfig {
                shield_circuit_path: PathBuf::from("../circuits/shield"),
                unshield_circuit_path: PathBuf::from("../circuits/unshield"),
                transfer_circuit_path: PathBuf::from("../circuits/transfer"),
                snarkjs_path: None,
            },
        }
    }
}

impl Config {
    pub fn from_env() -> Self {
        let mut config = Self::default();
        
        if let Ok(host) = std::env::var("PROOF_SERVICE_HOST") {
            config.server.host = host;
        }
        
        if let Ok(port) = std::env::var("PROOF_SERVICE_PORT") {
            config.server.port = port.parse().unwrap_or(8080);
        }
        
        // Override circuit paths from environment
        if let Ok(path) = std::env::var("SHIELD_CIRCUIT_PATH") {
            config.circuits.shield_circuit_path = PathBuf::from(path);
        }
        
        if let Ok(path) = std::env::var("UNSHIELD_CIRCUIT_PATH") {
            config.circuits.unshield_circuit_path = PathBuf::from(path);
        }
        
        if let Ok(path) = std::env::var("TRANSFER_CIRCUIT_PATH") {
            config.circuits.transfer_circuit_path = PathBuf::from(path);
        }
        
        // Set snarkjs path
        if let Ok(path) = std::env::var("SNARKJS_PATH") {
            config.circuits.snarkjs_path = Some(PathBuf::from(path));
        }
        
        config
    }
}

