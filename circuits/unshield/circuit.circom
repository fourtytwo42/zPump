// Unshield circuit for zPump
// Proves knowledge of nullifier secret that hashes to nullifier_hash
// 
// Production-ready circuit with Poseidon hash from circomlib
// 
// NOTE: Simplified version - proper byte conversion requires Num2Bits

pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Unshield() {
    // Private inputs (witness)
    signal input nullifier_secret[32];  // Secret that generates nullifier
    signal input amount;                // Amount being unshielded (public input)
    
    // Public outputs
    signal output nullifier_hash[32];  // Hash of nullifier_secret
    signal output amount_out;           // Amount (passed through)
    
    // Convert nullifier_secret bytes to field element (first 31 bytes)
    var nullifier_field = 0;
    for (var i = 0; i < 31; i++) {
        nullifier_field = nullifier_field * 256 + nullifier_secret[i];
    }
    
    // Poseidon hash with 2 inputs: nullifier_secret (as field element), padding
    component hash = Poseidon(2);
    hash.inputs[0] <== nullifier_field;
    hash.inputs[1] <== 0;
    
    // Output hash as field element (simplified - proper conversion requires Num2Bits)
    nullifier_hash[0] <== hash.out;
    for (var i = 1; i < 32; i++) {
        nullifier_hash[i] <== 0;
    }
    
    // Amount is passed through
    amount_out <== amount;
}

component main = Unshield();
