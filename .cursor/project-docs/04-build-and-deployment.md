# Build and Deployment Guide

This guide provides step-by-step instructions for building and deploying the zPump project correctly, avoiding all known issues.

## Prerequisites

1. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Solana CLI** (latest)
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

3. **Anchor** (latest)
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

4. **Node.js** (v18+)
   ```bash
   # Use nvm or install from nodejs.org
   ```

5. **PM2** (for services)
   ```bash
   npm install -g pm2
   ```

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/ZPump/zPump.git
cd zPump
```

### 2. Install Dependencies

```bash
# Install Rust dependencies (will be done automatically by Anchor)
# Install Node.js dependencies
cd web/app && npm install
cd ../../indexer/photon && npm install
cd ../../services/proof-rpc && npm install
cd ../..
```

### 3. Verify Program IDs

**CRITICAL:** Before building, verify all program IDs match:

```bash
# Check program IDs in source
grep -r "declare_id!" programs/

# Check program IDs in Anchor.toml
grep -A 5 "\[programs.localnet\]" Anchor.toml

# Check program IDs in SDK
grep -r "PROGRAM_ID" web/app/lib/onchain/programIds.ts
```

**Expected IDs (local development):**
- `ptf_factory`: `AG2eT5fyfPdv6wjDWCxr5Y9JBK9cD5rahLzuz2UbbBvg`
- `ptf_pool`: `9ykdCimDZGsCBB9ihC9QfDKib4KxYzpRZZTVrGp425Ku`
- `ptf_vault`: `iHWU2DfontkA7ZT2C6hFph3SSpkTjPm2a4t2C54CxSw`
- `ptf_verifier_groth16`: `DMvUxHwdJGkaRAJFXEKgDxsmVXL3gYttNsVP16xEr9TE`
- `ptf_dex`: `EkCLPUfEtSMJsEwJbVtDifeZ5H4dJREkMeFXAxwBde6b`

**MANDATORY: If IDs don't match, you MUST update them in ALL files before proceeding.**

**Exact Steps to Fix Program ID Mismatch:**

1. **Identify the correct program ID:**
   - Check `target/deploy/ptf_<program>-keypair.json` for the keypair's public key
   - Or use the ID from `Anchor.toml` if it's the source of truth
   - Or use the ID from `web/app/lib/onchain/programIds.ts` if SDK is source of truth

2. **Update ALL files with matching ID:**
   ```bash
   # Update Anchor.toml
   # Edit [programs.localnet] section with correct ID
   
   # Update program source
   # Edit programs/<program>/src/lib.rs
   # Change declare_id!("old_id") to declare_id!("new_id")
   
   # Update SDK
   # Edit web/app/lib/onchain/programIds.ts
   # Change export const <PROGRAM>_PROGRAM_ID = new PublicKey('old_id') to new PublicKey('new_id')
   
   # Update bootstrap script
   # Edit web/app/scripts/bootstrap-private-devnet.ts
   # Ensure PROGRAM_IDS constant uses correct ID from programIds.ts
   ```

3. **Verify all IDs match:**
   ```bash
   # MANDATORY: Run these commands and verify output matches
   grep -r "declare_id!" programs/
   grep -r "PROGRAM_ID" web/app/lib/onchain/programIds.ts
   grep -r "programs.localnet" Anchor.toml
   ```

4. **DO NOT proceed until all IDs match exactly**

## Building Programs

### 1. Build All Programs

```bash
# Build with ignore-keys (for local development)
anchor build --ignore-keys

# Or build specific program
anchor build --program-name ptf_pool --ignore-keys
```

**CRITICAL:** You MUST use `--ignore-keys` flag for local development to bypass program ID checks.

**MANDATORY Build Process:**

1. **Clean previous build (MANDATORY):**
   ```bash
   # MANDATORY: Clean previous build artifacts
   rm -rf target/deploy/*.so
   rm -rf target/idl/*.json
   ```

2. **Build with ignore-keys (MANDATORY):**
   ```bash
   # MANDATORY: Always use --ignore-keys flag
   anchor build --ignore-keys
   
   # If build fails, check:
   # - All dependencies installed
   # - Rust version is latest stable
   # - Anchor version is latest
   # - No syntax errors in source files
   ```

3. **Verify build output (MANDATORY):**
   ```bash
   # MANDATORY: Check all .so files were created
   ls -lh target/deploy/*.so
   
   # Expected files (ALL must exist):
   # - ptf_factory.so (must exist)
   # - ptf_pool.so (must exist)
   # - ptf_vault.so (must exist)
   # - ptf_verifier_groth16.so (must exist)
   # - ptf_dex.so (must exist)
   
   # If any file is missing, build failed - DO NOT PROCEED
   ```

4. **Check file sizes (MANDATORY):**
   ```bash
   # MANDATORY: Verify file sizes are reasonable
   # Programs MUST be 1-10MB typically
   # If program is 0 bytes, build failed
   # If program is > 50MB, may indicate build issue
   # If file is 0 bytes or extremely small, build failed - DO NOT PROCEED
   ```

### 2. Verify Build Success

```bash
# Check that .so files were created
ls -lh target/deploy/*.so

# Expected files:
# - ptf_factory.so
# - ptf_pool.so
# - ptf_vault.so
# - ptf_verifier_groth16.so
# - ptf_dex.so
```

### 3. Copy IDL Files (MANDATORY)

**CRITICAL:** You MUST copy IDL files after every build. The SDK requires up-to-date IDL files.

**MANDATORY Process:**

1. **Use the script (MANDATORY):**
   ```bash
   # MANDATORY: Use the script to copy IDL files
   ./scripts/copy-idls.sh
   
   # The script:
   # - Copies IDL files from web/app/idl/ to target/idl/
   # - Ensures all IDL files are present
   # - Logs success/failure for each file
   ```

2. **Verify IDL files copied (MANDATORY):**
   ```bash
   # MANDATORY: Verify all IDL files exist in web/app/idl/
   ls -lh web/app/idl/*.json
   
   # Expected files (ALL must exist):
   # - ptf_factory.json (must exist)
   # - ptf_pool.json (must exist)
   # - ptf_vault.json (must exist)
   # - ptf_verifier_groth16.json (must exist)
   # - ptf_dex.json (must exist)
   
   # If any file is missing, copy failed - DO NOT PROCEED
   ```

3. **Verify IDL file timestamps (MANDATORY):**
   ```bash
   # MANDATORY: Check IDL files are recent (within last minute)
   # If files are old, they may be stale - rebuild and recopy
   stat web/app/idl/ptf_pool.json
   # Check "Modify" timestamp is recent
   ```

4. **Manual copy (only if script fails):**
   ```bash
   # ONLY use if ./scripts/copy-idls.sh fails
   # MANDATORY: Copy each file individually
   cp target/idl/ptf_factory.json web/app/idl/ptf_factory.json
   cp target/idl/ptf_pool.json web/app/idl/ptf_pool.json
   cp target/idl/ptf_vault.json web/app/idl/ptf_vault.json
   cp target/idl/ptf_verifier_groth16.json web/app/idl/ptf_verifier_groth16.json
   cp target/idl/ptf_dex.json web/app/idl/ptf_dex.json
   
   # MANDATORY: Verify all files copied
   ls -lh web/app/idl/*.json
   ```

## Starting Local Validator

### MANDATORY: Using Upgrade Authority

**CRITICAL:** You MUST use this method to deploy programs with upgrade authority. There is no alternative. Do not use Option 2.

```bash
# Start validator and deploy with upgrade authority
./scripts/start-private-devnet-with-upgrade.sh
```

This script:
1. Starts `solana-test-validator` without `--bpf-program` flags
2. Generates upgrade authority keypair
3. Deploys all programs with upgrade authority
4. Verifies program IDs and authorities

### FORBIDDEN: Manual Start (Do Not Use)

**CRITICAL:** Do NOT use manual start. It will deploy programs with system program authority, making them immutable.

**FORBIDDEN Pattern (DO NOT USE):**
```bash
# FORBIDDEN: This deploys programs with system program authority
solana-test-validator \
  --reset \
  --quiet \
  --rpc-port 8899 \
  --faucet-port 9900

# FORBIDDEN: Manual deployment without upgrade authority
solana program deploy target/deploy/ptf_pool.so
# This creates immutable programs - DO NOT USE
```

**MANDATORY:** Always use `./scripts/start-private-devnet-with-upgrade.sh` instead.

## Deploying Programs

### Deploy with Upgrade Authority

**CRITICAL:** Always deploy with upgrade authority, never with system program authority.

```bash
# Generate upgrade authority keypair (if not exists)
solana-keygen new -o tmp/upgrade-authority.json

# Deploy each program
solana program deploy target/deploy/ptf_factory.so \
  --url http://127.0.0.1:8899 \
  --program-id target/deploy/ptf_factory-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json

solana program deploy target/deploy/ptf_vault.so \
  --url http://127.0.0.1:8899 \
  --program-id target/deploy/ptf_vault-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json

solana program deploy target/deploy/ptf_verifier_groth16.so \
  --url http://127.0.0.1:8899 \
  --program-id target/deploy/ptf_verifier_groth16-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json

solana program deploy target/deploy/ptf_pool.so \
  --url http://127.0.0.1:8899 \
  --program-id target/deploy/ptf_pool-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json
```

### Verify Deployment

```bash
# Check program IDs
solana program show ptf_factory --url http://127.0.0.1:8899
solana program show ptf_pool --url http://127.0.0.1:8899
solana program show ptf_vault --url http://127.0.0.1:8899
solana program show ptf_verifier_groth16 --url http://127.0.0.1:8899

# MANDATORY: Verify upgrade authority
# The authority MUST NOT be system program (11111111111111111111111111111111)
# The authority MUST be the upgrade authority keypair pubkey
# If authority is system program, deployment failed - DO NOT PROCEED
```

## Bootstrapping Environment

### 1. Run Bootstrap Script

```bash
# Bootstrap factory, mints, and verifying keys
cd web/app
npx tsx scripts/bootstrap-private-devnet.ts
```

This script:
1. Initializes factory
2. Creates test mints
3. Registers verifying keys
4. Creates mint catalog

### 2. Verify Bootstrap Success

```bash
# Check factory state
solana account <factory_state_pda> --url http://127.0.0.1:8899

# Check mint catalog
cat web/app/config/mints.generated.json
```

## Starting Services

### 1. Start Proof RPC Service

```bash
cd services/proof-rpc
pm2 start ecosystem.config.js --name ptf-proof
# Or
npm start
```

### 2. Start Photon Indexer

```bash
cd indexer/photon
pm2 start ecosystem.config.js --name ptf-indexer
# Or
npm start
```

### 3. Start Next.js Frontend

```bash
cd web/app
pm2 start ecosystem.config.js --name ptf-web
# Or
npm run dev
```

### 4. Verify Services

```bash
# Check PM2 status
pm2 status

# Check service logs
pm2 logs ptf-proof
pm2 logs ptf-indexer
pm2 logs ptf-web

# Check service endpoints
curl http://localhost:3001/health  # Proof RPC
curl http://localhost:3002/health  # Indexer
curl http://localhost:3000         # Frontend
```

## Upgrading Programs

### When to Upgrade

- After code changes
- After fixing bugs
- After adding features

### Upgrade Process

```bash
# 1. Rebuild programs
anchor build --ignore-keys

# 2. Upgrade each program
solana program deploy target/deploy/ptf_pool.so \
  --url http://127.0.0.1:8899 \
  --program-id target/deploy/ptf_pool-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json

# 3. Verify upgrade
solana program show ptf_pool --url http://127.0.0.1:8899
# Check that program data account size changed
```

**CRITICAL:** After upgrading, always:
1. Copy new IDL files: `./scripts/copy-idls.sh`
2. Restart services if needed
3. Run tests to verify upgrade

## Troubleshooting

### Program ID Mismatch

**Error:** `Error: Program ID mismatch detected`

**Fix:**
1. Check all program IDs match (see "Verify Program IDs" section)
2. Run `anchor keys sync` to sync keys
3. Rebuild with `--ignore-keys` flag

### Program Not Updating

**Error:** Program deployed but changes not reflected

**Fix:**
1. Verify deployment signature
2. Check program ID matches `declare_id!`
3. Restart validator if needed
4. Verify program binary size changed

### Immutable Program

**Error:** `Program's authority Some(11111111111111111111111111111111) does not match`

**Fix:**
1. Reset environment: `./scripts/reset-dev-env.sh` (clears ledger and state)
2. Deploy to new program IDs (update all references)
3. Use upgrade authority deployment script

### IDL Not Updating

**Error:** IDL doesn't reflect code changes

**Fix:**
1. Remove IDL file: `rm target/idl/ptf_pool.json`
2. Rebuild: `anchor build --ignore-keys`
3. Copy IDL: `./scripts/copy-idls.sh`

## Production Deployment

### Differences from Local

1. **Use real cluster:** `--url https://api.mainnet-beta.solana.com` (or devnet)
2. **Use production program IDs:** Update all files with production IDs
3. **Secure upgrade authority:** Store keypair securely
4. **Verify programs:** Use `solana program show` to verify deployment
5. **Monitor services:** Use proper monitoring for services

### MANDATORY Pre-Deployment Checklist

**Before deploying to production, you MUST complete all of these steps:**

1. **Program ID Verification (MANDATORY):**
```bash
# Verify all program IDs match in all files
grep -r "declare_id!" programs/
grep -r "PROGRAM_ID" web/app/lib/onchain/programIds.ts
grep -r "programs.localnet" Anchor.toml

# Expected output: All IDs must match exactly
# If any mismatch, STOP and fix before proceeding
```

2. **Build Verification (MANDATORY):**
```bash
# Build all programs
anchor build --ignore-keys

# Verify all .so files created
ls -lh target/deploy/*.so

# Expected files (MUST exist):
# - ptf_factory.so
# - ptf_pool.so
# - ptf_vault.so
# - ptf_verifier_groth16.so
# - ptf_dex.so

# If any file missing, STOP and fix before proceeding
```

3. **IDL Verification (MANDATORY):**
```bash
# Copy IDL files
./scripts/copy-idls.sh

# Verify IDL files exist
ls -lh web/app/idl/*.json

# Expected files (MUST exist):
# - ptf_factory.json
# - ptf_pool.json
# - ptf_vault.json
# - ptf_verifier_groth16.json
# - ptf_dex.json

# If any file missing, STOP and fix before proceeding
```

4. **Test Verification (MANDATORY):**
```bash
# Run full test suite on devnet first
cd web/app
npx tsx scripts/test-prepare-execute.ts

# ALL tests MUST pass
# If any test fails, STOP and fix before proceeding
```

5. **Upgrade Authority Setup (MANDATORY):**
```bash
# Generate upgrade authority keypair (if not exists)
solana-keygen new -o tmp/upgrade-authority.json

# Verify keypair created
ls -lh tmp/upgrade-authority.json

# If keypair doesn't exist, STOP and create before proceeding

# SECURITY: Store keypair securely (encrypted, backed up)
# DO NOT commit keypair to git
# DO NOT share keypair
```

### Production Deployment Steps (MANDATORY ORDER)

**Follow these steps in EXACT order. Do not skip any step.**

1. **Deploy to Devnet First (MANDATORY):**
```bash
# Set cluster to devnet
solana config set --url https://api.devnet.solana.com

# Deploy all programs to devnet
solana program deploy target/deploy/ptf_factory.so \
  --url https://api.devnet.solana.com \
  --program-id target/deploy/ptf_factory-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json

# Repeat for all programs:
# - ptf_vault.so
# - ptf_verifier_groth16.so
# - ptf_pool.so
# - ptf_dex.so

# Verify deployment
solana program show <program_id> --url https://api.devnet.solana.com

# Check authority is correct (NOT system program)
```

2. **Test on Devnet (MANDATORY):**
```bash
# Bootstrap devnet environment
cd web/app
npx tsx scripts/bootstrap-private-devnet.ts

# Run full test suite
npx tsx scripts/test-prepare-execute.ts

# ALL tests MUST pass
# If any test fails, STOP and fix before proceeding to mainnet
```

3. **Deploy to Mainnet (ONLY after devnet tests pass):**
```bash
# Set cluster to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Deploy all programs to mainnet
solana program deploy target/deploy/ptf_factory.so \
  --url https://api.mainnet-beta.solana.com \
  --program-id target/deploy/ptf_factory-keypair.json \
  --upgrade-authority tmp/upgrade-authority.json

# Repeat for all programs

# Verify deployment
solana program show <program_id> --url https://api.mainnet-beta.solana.com
```

4. **Post-Deployment Verification (MANDATORY):**
```bash
# Verify all programs deployed
for program in ptf_factory ptf_pool ptf_vault ptf_verifier_groth16 ptf_dex; do
    solana program show $program --url https://api.mainnet-beta.solana.com
    # Check:
    # - Program ID matches
    # - Authority is upgrade authority (NOT system program)
    # - Program data account exists
    # - Program is executable
done

# If any verification fails, STOP and investigate
```

### Production Checklist (MANDATORY)

**Before considering deployment complete, verify ALL items:**

- [ ] All program IDs updated for production in ALL files
- [ ] All programs built successfully
- [ ] All IDL files copied and verified
- [ ] All tests passing on devnet
- [ ] Programs deployed to devnet with upgrade authority
- [ ] All tests passing on devnet after deployment
- [ ] Upgrade authority keypair secured (encrypted, backed up)
- [ ] Programs deployed to mainnet with upgrade authority
- [ ] All programs verified on mainnet (IDs, authority, executable)
- [ ] Services configured for production
- [ ] Monitoring set up
- [ ] Documentation updated with production IDs

**CRITICAL:** Do not proceed to mainnet until ALL devnet tests pass and ALL verification steps complete.

## Next Steps

1. Read [Testing Guide](05-testing-guide.md) for testing instructions
2. Review [Troubleshooting Guide](06-troubleshooting-guide.md) for common issues
3. Check [Implementation Patterns](03-implementation-patterns.md) for code patterns

