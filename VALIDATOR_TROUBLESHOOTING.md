# Validator Troubleshooting Guide

## Issue: Validator Crashes with Core Dump

**Symptoms:**
- Validator starts but immediately crashes
- Error: "Aborted (core dumped)"
- No response on port 8899

**Root Causes:**
1. System resource limits (memory, file descriptors)
2. Corrupted ledger state
3. System library incompatibilities
4. Insufficient disk space

## Solutions

### Solution 1: Increase System Limits

```bash
# Check current limits
ulimit -a

# Increase limits (may require sudo)
ulimit -n 65536  # File descriptors
ulimit -s 8192   # Stack size
ulimit -v unlimited  # Virtual memory

# Try starting validator again
solana-test-validator --reset --rpc-port 8899
```

### Solution 2: Clean All State

```bash
# Stop all validators
pkill -9 -f "solana-test-validator"

# Remove all ledger state
rm -rf test-ledger
rm -rf ~/.config/solana/test-ledger
rm -rf ~/.local/share/solana/test-ledger

# Clear Solana cache
rm -rf ~/.cache/solana

# Try again
solana-test-validator --reset --rpc-port 8899
```

### Solution 3: Use Minimal Configuration

```bash
# Start with minimal options
solana-test-validator \
  --reset \
  --rpc-port 8899 \
  --quiet \
  --no-bpf-jit
```

### Solution 4: Check System Resources

```bash
# Check memory
free -h

# Check disk space
df -h

# Check if port is in use
netstat -tlnp | grep 8899
# or
ss -tlnp | grep 8899

# Kill process using port if needed
sudo lsof -ti:8899 | xargs kill -9
```

### Solution 5: Use Different Port

```bash
# Try different port
solana-test-validator --reset --rpc-port 8900

# Update config
solana config set --url http://127.0.0.1:8900
```

### Solution 6: Run with Debug Output

```bash
# Run in foreground to see errors
solana-test-validator --reset --rpc-port 8899 2>&1 | tee validator-debug.log

# Check for specific error messages
```

### Solution 7: Reinstall Solana CLI

```bash
# Remove existing installation
rm -rf ~/.local/share/solana

# Reinstall
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Verify installation
solana --version
solana-test-validator --version
```

### Solution 8: Use Docker (Alternative)

If system-level issues persist, use Docker:

```bash
# Run validator in Docker
docker run -d \
  --name solana-validator \
  -p 8899:8899 \
  -p 8900:8900 \
  -p 9900:9900 \
  solanalabs/solana:latest \
  solana-test-validator --reset --rpc-port 8899

# Update config to use Docker
solana config set --url http://localhost:8899
```

## Manual Validator Startup (Recommended)

Given the system-level issues, the most reliable approach is manual startup:

**Terminal 1: Validator**
```bash
cd /home/hendo420/zpump
solana-test-validator --reset --rpc-port 8899
# Keep this terminal open
```

**Terminal 2: Testing**
```bash
cd /home/hendo420/zpump
solana config set --url http://127.0.0.1:8899
solana airdrop 10
bash scripts/deploy-all.sh
npm run bootstrap-wsol
npm run bootstrap
cd tests && npm test
```

## Alternative: Use Devnet

If local validator continues to fail, use Solana devnet:

```bash
# Switch to devnet
solana config set --url https://api.devnet.solana.com

# Get airdrop
solana airdrop 2

# Deploy programs (requires devnet deployment)
# Note: This requires real SOL on devnet
```

## System Requirements

Minimum system requirements for validator:
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 10GB free space minimum
- **CPU:** 2 cores minimum
- **File Descriptors:** 4096 minimum, 65536 recommended

Check your system:
```bash
free -h
df -h
ulimit -n
nproc
```

## Getting Help

If none of these solutions work:

1. Check Solana CLI version: `solana --version`
2. Check system logs: `dmesg | tail -50`
3. Check validator logs: `cat /tmp/validator.log`
4. Try running validator with `strace` for debugging:
   ```bash
   strace -o validator-strace.log solana-test-validator --reset --rpc-port 8899
   ```

## Workaround: Documented Manual Process

Since automated validator startup is unreliable, the testing guide documents the manual process. This ensures anyone can follow along and get the same results, even if they need to start the validator manually.

