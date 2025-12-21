// Client for external verifier service

export interface VerificationAttestation {
  proof_hash: string;
  public_inputs_hash: string;
  verifying_key_hash: string;
  is_valid: boolean;
  timestamp: number;
  signature: string;
}

export interface VerifyRequest {
  proof: string;              // Hex-encoded proof (256 bytes)
  public_inputs: string;      // Hex-encoded public inputs
  verifying_key: string;       // Hex-encoded verifying key (binary format)
}

export interface VerifyResponse {
  is_valid: boolean;
  attestation: VerificationAttestation;
}

export class ExternalVerifierClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config?: { url?: string; timeout?: number }) {
    this.baseUrl = config?.url || process.env.EXTERNAL_VERIFIER_URL || "http://127.0.0.1:8081";
    this.timeout = config?.timeout || 30000; // 30 seconds default
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(this.timeout),
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async verifyProof(
    proof: Uint8Array,
    publicInputs: Uint8Array,
    verifyingKey: Uint8Array
  ): Promise<VerifyResponse> {
    const request: VerifyRequest = {
      proof: Buffer.from(proof).toString("hex"),
      public_inputs: Buffer.from(publicInputs).toString("hex"),
      verifying_key: Buffer.from(verifyingKey).toString("hex"),
    };

    const response = await fetch(`${this.baseUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Verification failed: ${response.status} ${errorText}`);
    }

    return await response.json() as VerifyResponse;
  }
}

