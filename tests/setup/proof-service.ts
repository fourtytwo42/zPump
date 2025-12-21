// Proof service setup utilities for tests

import { ProofServiceClient } from "../utils/proof-service";

let proofServiceClient: ProofServiceClient | null = null;
let proofServiceAvailable: boolean = false;

/**
 * Initialize test environment (alias for initializeProofService for compatibility)
 */
export async function initializeTestEnvironment(url?: string): Promise<boolean> {
  return initializeProofService(url);
}

/**
 * Initialize proof service connection
 */
export async function initializeProofService(url?: string): Promise<boolean> {
  try {
    proofServiceClient = new ProofServiceClient({ url });
    proofServiceAvailable = await proofServiceClient.healthCheck();
    
    if (proofServiceAvailable) {
      console.log("Proof service is available");
    } else {
      console.warn("Proof service is not available, tests will use mock proofs");
    }
    
    return proofServiceAvailable;
  } catch (error) {
    console.warn(`Failed to connect to proof service: ${error}`);
    proofServiceAvailable = false;
    return false;
  }
}

/**
 * Check if proof service is available
 */
export function isProofServiceAvailable(): boolean {
  return proofServiceAvailable;
}

/**
 * Get proof service client
 */
export function getProofServiceClient(): ProofServiceClient | null {
  return proofServiceClient;
}

/**
 * Get proof service URL from environment or default
 */
export function getProofServiceUrl(): string {
  return process.env.PROOF_SERVICE_URL || "http://127.0.0.1:8080";
}

