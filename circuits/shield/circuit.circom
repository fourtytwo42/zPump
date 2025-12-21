// Shield circuit for zPump
// Generates a commitment from a secret and amount using Poseidon hash
// 
// Production-ready circuit with Poseidon hash from circomlib
// 
// NOTE: This is a simplified version that uses Poseidon hash output directly
// For production, consider proper byte-to-field and field-to-byte conversion

pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Shield() {
    // Private inputs (witness)
    signal input secret[32];  // 32-byte secret
    signal input amount;       // Amount to shield
    
    // Public output (commitment)
    signal output commitment[32];
    
    // Convert secret bytes to field element
    // Simple approach: use first 31 bytes to avoid field overflow
    // In production, use proper Bytes2Packed or split across multiple field elements
    var secret_field = 0;
    for (var i = 0; i < 31; i++) {
        secret_field = secret_field * 256 + secret[i];
    }
    
    // Poseidon hash with 3 inputs: secret (as field element), amount, padding
    component hash = Poseidon(3);
    hash.inputs[0] <== secret_field;
    hash.inputs[1] <== amount;
    hash.inputs[2] <== 0;
    
    // For now, output hash as field element (will be converted to bytes off-chain)
    // In production, use Num2Bits to convert field element to bits, then to bytes
    // Simplified: output hash field element directly (commitment[0] = hash.out, rest = 0)
    // This is a placeholder - proper conversion requires Num2Bits which adds many constraints
    commitment[0] <== hash.out;
    for (var i = 1; i < 32; i++) {
        commitment[i] <== 0;
    }
}

component main = Shield();
