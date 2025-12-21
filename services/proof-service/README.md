# Proof Generation Service

REST API service for generating Groth16 proofs for zPump operations.

## Overview

This service generates cryptographic proofs for:
- **Shield operations**: Prove commitment creation
- **Unshield operations**: Prove nullifier validity
- **Transfer operations**: Prove private transfers

## Endpoints

### Health Check
```
GET /health
```

### Generate Shield Proof
```
POST /generate-proof/shield
Content-Type: application/json

{
  "commitment": "hex-encoded-commitment",
  "amount": 1000
}
```

### Generate Unshield Proof
```
POST /generate-proof/unshield
Content-Type: application/json

{
  "nullifier": "hex-encoded-nullifier",
  "amount": 1000,
  "recipient": "hex-encoded-recipient (optional)"
}
```

### Generate Transfer Proof
```
POST /generate-proof/transfer
Content-Type: application/json

{
  "nullifier": "hex-encoded-nullifier",
  "commitment": "hex-encoded-commitment",
  "amount": 1000
}
```

## Response Format

All endpoints return:
```json
{
  "proof": "hex-encoded-proof-192-bytes",
  "public_inputs": "hex-encoded-public-inputs"
}
```

## Configuration

Environment variables:
- `PROOF_SERVICE_HOST`: Server host (default: 127.0.0.1)
- `PROOF_SERVICE_PORT`: Server port (default: 8080)

## Running

```bash
cd services/proof-service
cargo run
```

## Circuit Files

The service expects circuit files in:
- `../circuits/shield/` - Shield circuit files
- `../circuits/unshield/` - Unshield circuit files
- `../circuits/transfer/` - Transfer circuit files

Each directory should contain:
- `circuit.wasm` - Compiled circuit
- `circuit.zkey` - Proving key
- `verification_key.json` - Verifying key (for reference)

