# Proof Generation Service

The proof generation service is a REST API that generates Groth16 proofs for zPump operations off-chain.

## Overview

Proof generation is computationally expensive and takes several seconds, so it's performed off-chain by the proof service. Only proof verification happens on-chain.

## Architecture

- **Service**: Rust-based REST API (actix-web)
- **Location**: `services/proof-service/`
- **Endpoints**: `/generate-proof/shield`, `/generate-proof/unshield`, `/generate-proof/transfer`
- **Response**: Hex-encoded proof (192 bytes) and public inputs

## Setup

### Prerequisites

- Rust toolchain
- Circuit files (`.wasm`, `.zkey`) for each operation type
- Node.js (if using snarkjs integration)

### Running the Service

```bash
cd services/proof-service
cargo run
```

The service will start on `http://127.0.0.1:8080` by default.

### Configuration

Environment variables:
- `PROOF_SERVICE_HOST`: Server host (default: 127.0.0.1)
- `PROOF_SERVICE_PORT`: Server port (default: 8080)

## API Endpoints

### Health Check

```
GET /health
```

Returns: `{"status": "ok"}`

### Generate Shield Proof

```
POST /generate-proof/shield
Content-Type: application/json

{
  "commitment": "hex-encoded-commitment",
  "amount": 1000
}
```

Response:
```json
{
  "proof": "hex-encoded-192-byte-proof",
  "public_inputs": "hex-encoded-public-inputs"
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

## Circuit Files

Circuit files should be placed in:
- `circuits/shield/` - Shield circuit files
- `circuits/unshield/` - Unshield circuit files
- `circuits/transfer/` - Transfer circuit files

Each directory should contain:
- `circuit.wasm` - Compiled circuit
- `circuit.zkey` - Proving key
- `verification_key.json` - Verifying key (for reference)

## Integration with Tests

The test suite automatically detects if the proof service is available and uses real proofs when possible, falling back to mock proofs if the service is unavailable.

Set `PROOF_SERVICE_URL` environment variable to point to the service:

```bash
export PROOF_SERVICE_URL=http://127.0.0.1:8080
npm test
```

## Production Deployment

For production:
1. Deploy proof service to a reliable infrastructure
2. Configure circuit files and keys securely
3. Set up monitoring and health checks
4. Consider rate limiting and authentication
5. Use HTTPS for secure communication

