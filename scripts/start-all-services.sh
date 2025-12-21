#!/bin/bash
# Start all services needed for real proof testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."

cd "$PROJECT_ROOT"

echo "=== Starting All Services ==="
echo ""

# Start proof service in background
echo "Starting proof service..."
./scripts/start-proof-service.sh > /tmp/proof-service.log 2>&1 &
PROOF_SERVICE_PID=$!
echo "  Proof service PID: $PROOF_SERVICE_PID"
echo "  Log: /tmp/proof-service.log"

# Wait a bit for proof service to start
sleep 3

# Start external verifier in background
echo "Starting external verifier..."
./scripts/start-external-verifier.sh > /tmp/external-verifier.log 2>&1 &
VERIFIER_PID=$!
echo "  External verifier PID: $VERIFIER_PID"
echo "  Log: /tmp/external-verifier.log"

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8080/health > /dev/null 2>&1 && \
       curl -s http://127.0.0.1:8081/health > /dev/null 2>&1; then
        echo "✅ Both services are ready!"
        echo ""
        echo "Service PIDs:"
        echo "  Proof service: $PROOF_SERVICE_PID"
        echo "  External verifier: $VERIFIER_PID"
        echo ""
        echo "To stop services:"
        echo "  kill $PROOF_SERVICE_PID $VERIFIER_PID"
        echo ""
        exit 0
    fi
    sleep 1
    echo -n "."
done

echo ""
echo "❌ Services did not start in time"
echo "Check logs:"
echo "  tail -f /tmp/proof-service.log"
echo "  tail -f /tmp/external-verifier.log"
exit 1

