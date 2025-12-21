// External verifier service for Groth16 proof verification
// Performs actual pairing checks using arkworks and provides attestations

use actix_web::{web, App, HttpServer, Result as ActixResult};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer};
use log::{info, error};

mod verifier;
mod attestation;

use verifier::Groth16Verifier;
use attestation::{VerificationAttestation, create_attestation};

#[derive(Debug, Clone)]
struct AppState {
    verifier: Arc<Groth16Verifier>,
    signing_key: Arc<SigningKey>,
    verifying_key: Arc<VerifyingKey>,
}

#[derive(Debug, Deserialize)]
struct VerifyRequest {
    proof: String,              // Hex-encoded proof (256 bytes)
    public_inputs: String,      // Hex-encoded public inputs
    verifying_key: String,      // Hex-encoded verifying key (binary format)
}

#[derive(Debug, Serialize)]
struct VerifyResponse {
    is_valid: bool,
    attestation: VerificationAttestation,
}

async fn health_check() -> ActixResult<web::Json<serde_json::Value>> {
    Ok(web::Json(serde_json::json!({"status": "ok"})))
}

async fn verify_proof(
    req: web::Json<VerifyRequest>,
    state: web::Data<AppState>,
) -> ActixResult<web::Json<VerifyResponse>> {
    info!("Received verification request");
    
    // Decode hex inputs (strip 0x prefix if present)
    let proof_hex = req.proof.strip_prefix("0x").unwrap_or(&req.proof);
    let proof_bytes = hex::decode(proof_hex)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid proof hex: {}", e)))?;
    
    let public_inputs_hex = req.public_inputs.strip_prefix("0x").unwrap_or(&req.public_inputs);
    let public_inputs_bytes = hex::decode(public_inputs_hex)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid public_inputs hex: {}", e)))?;
    
    let verifying_key_hex = req.verifying_key.strip_prefix("0x").unwrap_or(&req.verifying_key);
    let verifying_key_bytes = hex::decode(verifying_key_hex)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid verifying_key hex: {}", e)))?;
    
    // Verify proof using arkworks
    let is_valid = match state.verifier.verify(
        &proof_bytes,
        &public_inputs_bytes,
        &verifying_key_bytes,
    ) {
        Ok(valid) => valid,
        Err(e) => {
            error!("Verification error: {}", e);
            return Err(actix_web::error::ErrorInternalServerError("Verification failed"));
        }
    };
    
    info!("Verification result: {}", is_valid);
    
    // Create attestation
    let attestation = create_attestation(
        &proof_bytes,
        &public_inputs_bytes,
        &verifying_key_bytes,
        is_valid,
        &state.signing_key,
    );
    
    Ok(web::Json(VerifyResponse {
        is_valid,
        attestation,
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    // Generate or load signing key
    // In production, load from secure storage
    let signing_key = SigningKey::generate(&mut rand::rngs::OsRng);
    let verifying_key = signing_key.verifying_key();
    
    info!("External verifier service starting");
    info!("Verifier public key: {}", hex::encode(verifying_key.as_bytes()));
    
    let verifier = Arc::new(Groth16Verifier::new());
    let app_state = AppState {
        verifier,
        signing_key: Arc::new(signing_key),
        verifying_key: Arc::new(verifying_key),
    };
    
    let host = std::env::var("VERIFIER_SERVICE_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("VERIFIER_SERVICE_PORT")
        .unwrap_or_else(|_| "8081".to_string())
        .parse::<u16>()
        .unwrap_or(8081);
    
    info!("Starting external verifier service on {}:{}", host, port);
    
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(app_state.clone()))
            .route("/health", web::get().to(health_check))
            .route("/verify", web::post().to(verify_proof))
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}

