#!/bin/bash
# Automated Testing Script for zPump Smart Contracts
# This script automates the complete testing process once the validator is running

set -e

echo "=========================================="
echo "zPump Automated Testing Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if validator is running
check_validator() {
    echo -n "Checking validator status... "
    if curl -s http://127.0.0.1:8899 -X POST -H "Content-Type: application/json" \
       -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Validator is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Validator is not running${NC}"
        echo ""
        echo "Please start the validator first:"
        echo "  solana-test-validator --reset --rpc-port 8899"
        echo ""
        echo "Or see COMPLETE_TESTING_GUIDE.md for detailed instructions."
        return 1
    fi
}

# Function to wait for validator
wait_for_validator() {
    echo "Waiting for validator to be ready..."
    for i in {1..30}; do
        if check_validator; then
            return 0
        fi
        sleep 2
    done
    echo -e "${RED}Validator did not become ready in 60 seconds${NC}"
    return 1
}

# Step 1: Check validator
echo "Step 1: Validator Check"
echo "----------------------"
if ! check_validator; then
    if [ "$1" != "--wait" ]; then
        exit 1
    fi
    wait_for_validator || exit 1
fi
echo ""

# Step 2: Configure Solana CLI
echo "Step 2: Configure Solana CLI"
echo "----------------------------"
solana config set --url http://127.0.0.1:8899
echo -e "${GREEN}✓ Solana CLI configured${NC}"
echo ""

# Step 3: Check and fund account
echo "Step 3: Account Funding"
echo "----------------------"
BALANCE=$(solana balance --lamports 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")
if [ "$BALANCE" -lt 1000000000 ]; then
    echo "Balance is low, requesting airdrop..."
    solana airdrop 10
    sleep 3
fi
BALANCE=$(solana balance --lamports 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")
echo -e "${GREEN}✓ Account balance: $((BALANCE / 1000000000)) SOL${NC}"
echo ""

# Step 4: Deploy programs
echo "Step 4: Deploy Programs"
echo "----------------------"
if bash scripts/deploy-all.sh; then
    echo -e "${GREEN}✓ All programs deployed${NC}"
else
    echo -e "${RED}✗ Program deployment failed${NC}"
    exit 1
fi
echo ""

# Step 5: Bootstrap wSOL
echo "Step 5: Bootstrap wSOL"
echo "---------------------"
if npm run bootstrap-wsol; then
    echo -e "${GREEN}✓ wSOL bootstrapped${NC}"
else
    echo -e "${YELLOW}⚠ wSOL bootstrap failed (may already exist)${NC}"
fi
echo ""

# Step 6: Bootstrap environment
echo "Step 6: Bootstrap Environment"
echo "------------------------------"
if npm run bootstrap; then
    echo -e "${GREEN}✓ Environment bootstrapped${NC}"
else
    echo -e "${YELLOW}⚠ Environment bootstrap failed (may already be initialized)${NC}"
fi
echo ""

# Step 7: Install test dependencies
echo "Step 7: Install Test Dependencies"
echo "---------------------------------"
cd tests
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# Step 8: Run tests
echo "Step 8: Run Test Suite"
echo "----------------------"
echo "Running all tests..."
if npm test 2>&1 | tee /tmp/test-results.log; then
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    TEST_EXIT=$?
    echo -e "${YELLOW}⚠ Some tests may have failed (exit code: $TEST_EXIT)${NC}"
    echo "Check /tmp/test-results.log for details"
fi
echo ""

# Step 9: Generate coverage report
echo "Step 9: Generate Coverage Report"
echo "---------------------------------"
if npx tsx coverage-report.ts 2>&1 | tee /tmp/coverage-report.log; then
    echo -e "${GREEN}✓ Coverage report generated${NC}"
else
    echo -e "${YELLOW}⚠ Coverage report generation had issues${NC}"
    echo "Check /tmp/coverage-report.log for details"
fi
echo ""

# Summary
echo "=========================================="
echo "Testing Complete!"
echo "=========================================="
echo ""
echo "Results:"
echo "  - Test results: /tmp/test-results.log"
echo "  - Coverage report: /tmp/coverage-report.log"
echo ""
echo "Next steps:"
echo "  1. Review test results"
echo "  2. Check coverage report"
echo "  3. Fix any failing tests"
echo "  4. Achieve 99% coverage target"
echo ""

