# Proof Service Deployment Guide

## Overview

The zPump proof generation service is a Rust-based REST API that generates Groth16 proofs using compiled Circom circuits and snarkjs.

## Prerequisites

- Rust (latest stable)
- Node.js (v20+)
- snarkjs (via npx or globally installed)
- Compiled circuit files:
  - `circuit_js/circuit.wasm` - Compiled circuit WebAssembly
  - `circuit_0001.zkey` - Proving key

## Configuration

The proof service can be configured via environment variables:

```bash
# Server configuration
PROOF_SERVICE_HOST=127.0.0.1
PROOF_SERVICE_PORT=8080

# Circuit paths (absolute paths recommended)
SHIELD_CIRCUIT_PATH=/path/to/circuits/shield
UNSHIELD_CIRCUIT_PATH=/path/to/circuits/unshield
TRANSFER_CIRCUIT_PATH=/path/to/circuits/transfer

# snarkjs path (use "npx" for npx snarkjs, or path to snarkjs binary)
SNARKJS_PATH=npx

# Logging
RUST_LOG=info
```

## Building

```bash
cd services/proof-service
cargo build --release
```

The binary will be at: `services/proof-service/target/release/proof-service`

## Running

### Development

```bash
cd services/proof-service
export SHIELD_CIRCUIT_PATH=/absolute/path/to/circuits/shield
export UNSHIELD_CIRCUIT_PATH=/absolute/path/to/circuits/unshield
export TRANSFER_CIRCUIT_PATH=/absolute/path/to/circuits/transfer
export SNARKJS_PATH=npx
./target/release/proof-service
```

### Production

Use a process manager like systemd, supervisor, or Docker:

```bash
# Example systemd service
[Unit]
Description=zPump Proof Service
After=network.target

[Service]
Type=simple
User=proof-service
WorkingDirectory=/opt/zpump/proof-service
Environment="SHIELD_CIRCUIT_PATH=/opt/zpump/circuits/shield"
Environment="UNSHIELD_CIRCUIT_PATH=/opt/zpump/circuits/unshield"
Environment="TRANSFER_CIRCUIT_PATH=/opt/zpump/circuits/transfer"
Environment="SNARKJS_PATH=npx"
Environment="RUST_LOG=info"
ExecStart=/opt/zpump/proof-service/target/release/proof-service
Restart=always

[Install]
WantedBy=multi-user.target
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{"status": "ok"}
```

### Generate Shield Proof

```bash
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
  "proof": "hex-encoded-proof",
  "public_inputs": "hex-encoded-public-inputs"
}
```

### Generate Unshield Proof

```bash
POST /generate-proof/unshield
Content-Type: application/json

{
  "nullifier": "hex-encoded-nullifier",
  "amount": 1000,
  "recipient": "optional-hex-encoded-recipient"
}
```

### Generate Transfer Proof

```bash
POST /generate-proof/transfer
Content-Type: application/json

{
  "nullifier": "hex-encoded-nullifier",
  "commitment": "hex-encoded-commitment",
  "amount": 1000
}
```

## Proof Format

- **Proof**: 256 bytes (hex-encoded in API)
  - 64 bytes: G1 point A
  - 128 bytes: G2 point B
  - 64 bytes: G1 point C

- **Public Inputs**: Variable length (hex-encoded in API)
  - Shield: 32 bytes (commitment)
  - Unshield: 64 bytes (nullifier_hash + amount)
  - Transfer: 96 bytes (nullifier_in + commitment_out + amount)

## Troubleshooting

### Circuit Files Not Found

If you see "Using placeholder proof generation", check:

1. Circuit paths are absolute (not relative)
2. Files exist at:
   - `{CIRCUIT_PATH}/circuit_js/circuit.wasm`
   - `{CIRCUIT_PATH}/circuit_0001.zkey`
3. Paths are correctly set in environment variables

### snarkjs Not Found

If proof generation fails with snarkjs errors:

1. Ensure Node.js is installed
2. Use `SNARKJS_PATH=npx` to use npx
3. Or install snarkjs globally: `npm install -g snarkjs`
4. Or provide path to snarkjs binary

### Proof Generation Fails

Check logs for:
- Witness generation errors (input format issues)
- Proof generation errors (circuit/key mismatch)
- File permission issues

## Performance

- Proof generation time: ~2-5 seconds per proof (depends on circuit complexity)
- Concurrent requests: Handled by Actix-web (default: 4 workers)
- Resource usage: ~100-200MB RAM per worker

## Security Considerations

1. **Network Security**: Use HTTPS in production
2. **Authentication**: Add API key authentication for production
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate all inputs before processing
5. **Circuit Files**: Protect proving keys (`.zkey` files) - they should be kept secure

## Monitoring

Monitor:
- Request latency
- Error rates
- Proof generation success rate
- Resource usage (CPU, memory)

## See Also

- [CIRCUIT_COMPILATION.md](./CIRCUIT_COMPILATION.md) - Circuit compilation guide
- [PROOF_SERVICE_SETUP.md](./PROOF_SERVICE_SETUP.md) - Setup instructions
- [CIRCUIT_IMPLEMENTATION.md](./CIRCUIT_IMPLEMENTATION.md) - Circuit implementation details

