# Proof Service Setup Guide

Complete guide for setting up and running the zPump proof generation service.

## Overview

The proof service is a Rust-based REST API that generates Groth16 proofs off-chain. It can use either:
- **snarkjs integration**: Real proof generation from compiled circuits
- **Placeholder mode**: Deterministic proofs for development/testing

## Prerequisites

1. **Rust toolchain** (1.70+)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js** (for snarkjs integration)
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **snarkjs** (optional, for real proof generation)
   ```bash
   npm install -g snarkjs
   ```

4. **Circuit files** (optional, for real proof generation)
   - `circuit.wasm` - Compiled circuit
   - `circuit.zkey` - Proving key
   - Located in `circuits/{shield,unshield,transfer}/`

## Quick Start

### 1. Build the Service

```bash
cd services/proof-service
cargo build --release
```

### 2. Run the Service

```bash
# Default configuration (127.0.0.1:8080)
cargo run

# Or with custom configuration
PROOF_SERVICE_HOST=0.0.0.0 PROOF_SERVICE_PORT=8080 cargo run
```

### 3. Verify It's Running

```bash
curl http://127.0.0.1:8080/health
# Should return: {"status":"ok"}
```

## Configuration

### Environment Variables

- `PROOF_SERVICE_HOST`: Server host (default: `127.0.0.1`)
- `PROOF_SERVICE_PORT`: Server port (default: `8080`)
- `RUST_LOG`: Log level (default: `info`)

### Circuit Configuration

The service looks for circuit files in:
- `circuits/shield/` - Shield circuit files
- `circuits/unshield/` - Unshield circuit files
- `circuits/transfer/` - Transfer circuit files

Each directory should contain:
- `circuit.wasm` - Compiled circuit (for snarkjs)
- `circuit.zkey` - Proving key (for snarkjs)

If these files are missing, the service will use placeholder proof generation.

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
  "commitment": "0x0123456789abcdef...",
  "amount": 1000
}
```

Response:
```json
{
  "proof": "hex-encoded-256-byte-proof",
  "public_inputs": "hex-encoded-public-inputs"
}
```

### Generate Unshield Proof

```bash
POST /generate-proof/unshield
Content-Type: application/json

{
  "nullifier": "0xfedcba9876543210...",
  "amount": 1000,
  "recipient": "0x..." // optional
}
```

### Generate Transfer Proof

```bash
POST /generate-proof/transfer
Content-Type: application/json

{
  "nullifier": "0xfedcba9876543210...",
  "commitment": "0x0123456789abcdef...",
  "amount": 1000
}
```

## Operation Modes

### Placeholder Mode (Default)

When circuit files are not available, the service generates deterministic placeholder proofs. These are:
- ✅ Fast to generate
- ✅ Deterministic (same inputs = same proof)
- ❌ NOT cryptographically secure
- ❌ NOT suitable for production

### Real Proof Mode

When circuit files (`.wasm` and `.zkey`) are available, the service uses snarkjs to generate real Groth16 proofs. These are:
- ✅ Cryptographically secure
- ✅ Suitable for production
- ⚠️ Slower to generate (several seconds per proof)
- ⚠️ Requires compiled circuits

## Testing

### Manual Testing

```bash
# Test health endpoint
curl http://127.0.0.1:8080/health

# Test shield proof generation
curl -X POST http://127.0.0.1:8080/generate-proof/shield \
  -H "Content-Type: application/json" \
  -d '{"commitment": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "amount": 1000}'
```

### Automated Testing

Use the provided test script:

```bash
./scripts/test-proof-service.sh
```

Or use the TypeScript client in tests:

```typescript
import { ProofServiceClient } from "./utils/proof-service";

const client = new ProofServiceClient({ url: "http://127.0.0.1:8080" });
const proof = await client.generateShieldProof(commitment, amount);
```

## Troubleshooting

### Service Won't Start

1. **Check port availability**
   ```bash
   lsof -i :8080
   ```

2. **Check Rust installation**
   ```bash
   rustc --version
   cargo --version
   ```

3. **Check for compilation errors**
   ```bash
   cd services/proof-service
   cargo check
   ```

### Proof Generation Fails

1. **Check circuit files exist**
   ```bash
   ls -la circuits/shield/circuit.wasm
   ls -la circuits/shield/circuit.zkey
   ```

2. **Check snarkjs is installed**
   ```bash
   snarkjs --version
   ```

3. **Check service logs**
   ```bash
   RUST_LOG=debug cargo run
   ```

### Placeholder Proofs Generated

If you see warnings about placeholder proofs:
- Circuit files (`.wasm`, `.zkey`) are missing
- Service is falling back to placeholder mode
- This is expected for development/testing

## Production Deployment

### Systemd Service

Create `/etc/systemd/system/zpump-proof-service.service`:

```ini
[Unit]
Description=zPump Proof Generation Service
After=network.target

[Service]
Type=simple
User=zpump
WorkingDirectory=/opt/zpump/services/proof-service
ExecStart=/opt/zpump/services/proof-service/target/release/proof-service
Environment="PROOF_SERVICE_HOST=0.0.0.0"
Environment="PROOF_SERVICE_PORT=8080"
Environment="RUST_LOG=info"
Restart=always

[Install]
WantedBy=multi-user.target
```

### Docker Deployment

```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY services/proof-service .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/proof-service /usr/local/bin/
EXPOSE 8080
CMD ["proof-service"]
```

## Performance

### Expected Performance

- **Placeholder proofs**: < 1ms per proof
- **Real proofs** (with snarkjs): 2-10 seconds per proof
- **Concurrent requests**: Handled by actix-web (async)

### Optimization

1. **Use connection pooling** in clients
2. **Cache frequently used proofs** (if inputs are deterministic)
3. **Scale horizontally** with load balancer
4. **Use faster proving keys** (smaller circuits = faster proofs)

## Security Considerations

1. **Network Security**: Use HTTPS in production
2. **Authentication**: Add API keys or OAuth (not implemented)
3. **Rate Limiting**: Add rate limiting (not implemented)
4. **Input Validation**: Validate all inputs (implemented)
5. **Circuit Files**: Protect `.zkey` files (they contain secrets)

## See Also

- [PROOF_SERVICE.md](./PROOF_SERVICE.md) - API documentation
- [CIRCUIT_SETUP.md](./CIRCUIT_SETUP.md) - Circuit compilation guide
- [GROTH16_VERIFICATION.md](./GROTH16_VERIFICATION.md) - Verification implementation

