mod config;
mod circuit_handler;
mod proof_generator;
mod snarkjs_integration;

use hex;

use actix_web::{web, App, HttpServer, HttpResponse, Result as ActixResult};
use config::Config;
use proof_generator::ProofGenerator;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct ShieldRequest {
    commitment: String,
    amount: u64,
}

#[derive(Debug, Deserialize)]
struct UnshieldRequest {
    nullifier: String,
    amount: u64,
    recipient: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TransferRequest {
    nullifier: String,
    commitment: String,
    amount: u64,
}

#[derive(Debug, Serialize)]
struct ProofApiResponse {
    proof: String,
    public_inputs: String,
}

async fn generate_shield_proof(
    req: web::Json<ShieldRequest>,
    generator: web::Data<ProofGenerator>,
) -> ActixResult<HttpResponse> {
    let commitment_bytes = hex::decode(&req.commitment)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid commitment hex: {}", e)))?;
    
    match generator.generate_shield_proof(&commitment_bytes, req.amount).await {
        Ok(response) => {
            Ok(HttpResponse::Ok().json(ProofApiResponse {
                proof: hex::encode(&response.proof),
                public_inputs: hex::encode(&response.public_inputs),
            }))
        }
        Err(e) => {
            Err(actix_web::error::ErrorInternalServerError(format!("Proof generation failed: {}", e)))
        }
    }
}

async fn generate_unshield_proof(
    req: web::Json<UnshieldRequest>,
    generator: web::Data<ProofGenerator>,
) -> ActixResult<HttpResponse> {
    let nullifier_bytes = hex::decode(&req.nullifier)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid nullifier hex: {}", e)))?;
    
    let recipient_bytes = req.recipient.as_ref()
        .map(|r| hex::decode(r))
        .transpose()
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid recipient hex: {}", e)))?;
    
    match generator.generate_unshield_proof(
        &nullifier_bytes,
        req.amount,
        recipient_bytes.as_deref(),
    ).await {
        Ok(response) => {
            Ok(HttpResponse::Ok().json(ProofApiResponse {
                proof: hex::encode(&response.proof),
                public_inputs: hex::encode(&response.public_inputs),
            }))
        }
        Err(e) => {
            Err(actix_web::error::ErrorInternalServerError(format!("Proof generation failed: {}", e)))
        }
    }
}

async fn generate_transfer_proof(
    req: web::Json<TransferRequest>,
    generator: web::Data<ProofGenerator>,
) -> ActixResult<HttpResponse> {
    let nullifier_bytes = hex::decode(&req.nullifier)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid nullifier hex: {}", e)))?;
    
    let commitment_bytes = hex::decode(&req.commitment)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid commitment hex: {}", e)))?;
    
    match generator.generate_transfer_proof(
        &nullifier_bytes,
        &commitment_bytes,
        req.amount,
    ).await {
        Ok(response) => {
            Ok(HttpResponse::Ok().json(ProofApiResponse {
                proof: hex::encode(&response.proof),
                public_inputs: hex::encode(&response.public_inputs),
            }))
        }
        Err(e) => {
            Err(actix_web::error::ErrorInternalServerError(format!("Proof generation failed: {}", e)))
        }
    }
}

async fn health_check() -> ActixResult<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({"status": "ok"})))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    let config = Config::from_env();
    
    log::info!("Configuration loaded:");
    log::info!("  Shield circuit: {:?}", config.circuits.shield_circuit_path);
    log::info!("  Unshield circuit: {:?}", config.circuits.unshield_circuit_path);
    log::info!("  Transfer circuit: {:?}", config.circuits.transfer_circuit_path);
    log::info!("  snarkjs path: {:?}", config.circuits.snarkjs_path);
    
    // Initialize proof generator
    let generator = ProofGenerator::new(
        config.circuits.shield_circuit_path.clone(),
        config.circuits.unshield_circuit_path.clone(),
        config.circuits.transfer_circuit_path.clone(),
        config.circuits.snarkjs_path.clone(),
    );
    
    let generator_data = web::Data::new(generator);
    
    log::info!("Starting proof service on {}:{}", config.server.host, config.server.port);
    
    HttpServer::new(move || {
        App::new()
            .app_data(generator_data.clone())
            .route("/health", web::get().to(health_check))
            .route("/generate-proof/shield", web::post().to(generate_shield_proof))
            .route("/generate-proof/unshield", web::post().to(generate_unshield_proof))
            .route("/generate-proof/transfer", web::post().to(generate_transfer_proof))
    })
    .bind((config.server.host.as_str(), config.server.port))?
    .run()
    .await
}


