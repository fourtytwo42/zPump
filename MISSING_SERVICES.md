# Missing Services and Components

## Current Status

### ✅ Services That Exist

1. **Proof Service** (`services/proof-service/`)
   - ✅ Code exists and compiles
   - ✅ Script exists: `scripts/start-proof-service.sh`
   - ❌ **NOT in workspace** (missing from root `Cargo.toml`)
   - ❌ **Not built** (no binary in `target/release/`)

2. **External Verifier Service** (`services/external-verifier/`)
   - ✅ Code exists and compiles
   - ✅ Script exists: `scripts/start-external-verifier.sh`
   - ✅ **In workspace** (included in root `Cargo.toml`)
   - ❌ **Not built** (no binary in `target/release/`)

### ❌ Missing Components

#### 1. Circuit Files (Required for Proof Service)

**Missing:**
- `circuits/shield/circuit.wasm` - Compiled circuit for shield operations
- `circuits/shield/circuit_final.zkey` - Proving key for shield operations
- `circuits/unshield/circuit.wasm` - Compiled circuit for unshield operations
- `circuits/unshield/circuit_final.zkey` - Proving key for unshield operations
- `circuits/transfer/circuit.wasm` - Compiled circuit for transfer operations
- `circuits/transfer/circuit_final.zkey` - Proving key for transfer operations

**Status:** ❌ **All missing**

**To Generate:**
```bash
# Install circuit dependencies
./scripts/install-circuit-deps.sh

# Install circom compiler
./scripts/install-circom.sh

# Generate circuits and keys
./scripts/generate-circuits.sh
```

#### 2. snarkjs (Required for Proof Generation)

**Status:** ❌ **Not found in PATH**

**Available via:** ✅ `npx snarkjs` (configured in proof service)

**To Install Globally (Optional):**
```bash
npm install -g snarkjs
```

#### 3. Service Binaries (Not Built)

**Missing:**
- `services/proof-service/target/release/proof-service`
- `services/external-verifier/target/release/external-verifier`

**To Build:**
```bash
# Build proof service
cd services/proof-service
cargo build --release

# Build external verifier
cd ../external-verifier
cargo build --release
```

#### 4. Workspace Configuration

**Issue:** Proof service is NOT in the root `Cargo.toml` workspace

**Current:**
```toml
members = [
    "programs/ptf_pool",
    "programs/ptf_factory",
    "programs/ptf_vault",
    "programs/ptf_verifier_groth16",
    "programs/ptf_dex",
    "programs/common",
    "services/external-verifier",  # ✅ Included
    # "services/proof-service",     # ❌ Missing
]
```

**Fix:** Add `services/proof-service` to workspace members

## What's Needed to Run Tests

### For Mock Proofs (Current State)
- ✅ **No services needed** - Tests work with mock proofs
- ✅ **Local validator** - Only requirement

### For Real Proofs (Full Testing)
- ❌ **Proof Service** - Needs to be:
  1. Added to workspace
  2. Built (`cargo build --release`)
  3. Circuit files generated (`.wasm` and `.zkey`)
  4. Started (`./scripts/start-proof-service.sh`)

- ❌ **External Verifier** - Needs to be:
  1. Built (`cargo build --release`)
  2. Started (`./scripts/start-external-verifier.sh`)

## Quick Fix Checklist

### 1. Add Proof Service to Workspace
```bash
# Edit Cargo.toml to add:
"services/proof-service",
```

### 2. Generate Circuit Files
```bash
# Install dependencies
./scripts/install-circuit-deps.sh
./scripts/install-circom.sh

# Generate circuits
./scripts/generate-circuits.sh
```

### 3. Build Services
```bash
# Build proof service
cd services/proof-service && cargo build --release

# Build external verifier
cd ../external-verifier && cargo build --release
```

### 4. Start Services
```bash
# Terminal 1: Start proof service
./scripts/start-proof-service.sh

# Terminal 2: Start external verifier
./scripts/start-external-verifier.sh

# Terminal 3: Run tests
USE_REAL_PROOFS=true ./scripts/run-comprehensive-tests.sh
```

## Summary

**Critical Missing Items:**
1. ❌ Circuit files (`.wasm` and `.zkey`) - Required for proof generation
2. ❌ Service binaries not built - Need `cargo build --release`
3. ❌ Proof service not in workspace - Need to add to `Cargo.toml`

**Optional (But Recommended):**
- snarkjs globally installed (currently using `npx`)

**Current Capability:**
- ✅ Tests work with mock proofs (no services needed)
- ❌ Real proof testing requires all missing components above

