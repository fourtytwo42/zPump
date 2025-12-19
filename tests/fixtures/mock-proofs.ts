// Mock proof fixtures for testing

export const MOCK_SHIELD_PROOF = {
  proof: new Uint8Array(192).fill(1),
  publicInputs: new Uint8Array(32).fill(2),
};

export const MOCK_UNSHIELD_PROOF = {
  proof: new Uint8Array(192).fill(3),
  publicInputs: new Uint8Array(32).fill(4),
};

export const MOCK_TRANSFER_PROOF = {
  proof: new Uint8Array(192).fill(5),
  publicInputs: new Uint8Array(32).fill(6),
};

export function generateMockProofForOperation(
  operationType: "shield" | "unshield" | "transfer",
  amount: number,
  commitment: Uint8Array,
): { proof: Uint8Array; publicInputs: Uint8Array } {
  // Generate deterministic mock proof based on operation type and inputs
  const proof = new Uint8Array(192);
  const publicInputs = new Uint8Array(32);
  
  // Fill with deterministic values based on inputs
  const seed = operationType.charCodeAt(0) + amount + commitment[0];
  for (let i = 0; i < proof.length; i++) {
    proof[i] = (seed + i) % 256;
  }
  for (let i = 0; i < publicInputs.length; i++) {
    publicInputs[i] = (seed + i + 100) % 256;
  }
  
  return { proof, publicInputs };
}

