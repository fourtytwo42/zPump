# zPump Project Documentation

This folder contains comprehensive documentation for building and maintaining the zPump project. These documents are designed to help you build the project correctly from scratch, avoiding all the problems we've encountered during development.

## Documentation Structure

1. **[Project Overview](01-project-overview.md)** - High-level architecture, components, and goals
2. **[Critical Issues and Solutions](02-critical-issues-and-solutions.md)** - All known problems and how to avoid them
3. **[Implementation Patterns](03-implementation-patterns.md)** - Proven patterns that work
4. **[Build and Deployment Guide](04-build-and-deployment.md)** - Step-by-step build and deployment instructions
5. **[Testing Guide](05-testing-guide.md)** - How to test the project properly
6. **[Troubleshooting Guide](06-troubleshooting-guide.md)** - Common issues and fixes
7. **[Architecture Deep Dive](07-architecture-deep-dive.md)** - Detailed architecture documentation

## Quick Start

**If you're building this project from scratch:**

1. Start with [Project Overview](01-project-overview.md) to understand the system
2. Read [Critical Issues and Solutions](02-critical-issues-and-solutions.md) to avoid known problems
3. Follow [Implementation Patterns](03-implementation-patterns.md) for all code changes
4. Use [Build and Deployment Guide](04-build-and-deployment.md) for setup
5. Reference [Troubleshooting Guide](06-troubleshooting-guide.md) when issues arise
6. Review [Architecture Deep Dive](07-architecture-deep-dive.md) for required improvements

## Key Principles

**CRITICAL:** This project cannot rely on many standard Solana/Anchor features due to bugs and limitations. The documentation reflects this reality:

- **Never use Anchor's `#[derive(Accounts)]` for instructions with 10+ accounts** - Use raw instruction pattern instead
- **Always use `AccountInfo` instead of `Account` types when possible** - Reduces stack usage
- **Never use `init_if_needed`** - Always manually create accounts with `AnchorSerialize` format
- **Always deploy programs with upgrade authority** - Never deploy with system program authority
- **Always use centralized PDA derivation** - Use `PoolAddresses::derive_all()` instead of individual derivations
- **Always validate accounts manually** - Don't rely on Anchor's validation (it has bugs)

## Related Documentation

- `KNOWN_PROBLEMS_AND_PATTERNS.md` - Quick reference for known issues
- `PROBLEM_SCRATCH_PAD.md` - Active debugging work
- `docs/` - Original project documentation (may contain outdated information)

## Important Notes

**Program ID Discrepancy:**
- DEX program ID in `Anchor.toml` and `declare_id!`: `EkCLPUfEtSMJsEwJbVtDifeZ5H4dJREkMeFXAxwBde6b`
- DEX program ID in SDK (`web/app/lib/onchain/programIds.ts`): `HRbTSfU2WoUWqq2Y7y5WfGPy7LaXxMQoyrcdJPfEhd7U`
- **Action Required:** Verify which ID is correct and update all files to match

**Script Names:**
- Use `./scripts/reset-dev-env.sh` (not `clear-ledger-and-keypairs.sh` which doesn't exist)
- This script clears ledger, resets state, and restarts services

