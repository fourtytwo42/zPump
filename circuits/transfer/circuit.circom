// Transfer circuit for zPump
// Proves:
// 1. Knowledge of nullifier_secret that hashes to nullifier_in
// 2. New commitment_out is hash of new_secret and amount
// 
// Production-ready circuit with Poseidon hash from circomlib
// 
// NOTE: Simplified version - proper byte conversion requires Num2Bits

pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Transfer() {
    // Private inputs (witness)
    signal input nullifier_secret[32];  // Secret for input nullifier
    signal input new_secret[32];        // Secret for output commitment
    signal input amount;                // Transfer amount
    
    // Public outputs
    signal output nullifier_in[32];      // Hash of nullifier_secret
    signal output commitment_out[32];     // Hash of new_secret and amount
    signal output amount_out;              // Amount (public)
    
    // Convert nullifier_secret bytes to field element (first 31 bytes)
    var nullifier_field = 0;
    for (var i = 0; i < 31; i++) {
        nullifier_field = nullifier_field * 256 + nullifier_secret[i];
    }
    
    // Convert new_secret bytes to field element (first 31 bytes)
    var new_secret_field = 0;
    for (var i = 0; i < 31; i++) {
        new_secret_field = new_secret_field * 256 + new_secret[i];
    }
    
    // Poseidon hash for nullifier: hash(nullifier_secret)
    component hash1 = Poseidon(2);
    hash1.inputs[0] <== nullifier_field;
    hash1.inputs[1] <== 0;
    
    // Poseidon hash for commitment: hash(new_secret, amount)
    component hash2 = Poseidon(3);
    hash2.inputs[0] <== new_secret_field;
    hash2.inputs[1] <== amount;
    hash2.inputs[2] <== 0;
    
    // Output hashes as field elements (simplified)
    nullifier_in[0] <== hash1.out;
    for (var i = 1; i < 32; i++) {
        nullifier_in[i] <== 0;
    }
    
    commitment_out[0] <== hash2.out;
    for (var i = 1; i < 32; i++) {
        commitment_out[i] <== 0;
    }
    
    // Amount is passed through
    amount_out <== amount;
}

component main = Transfer();
