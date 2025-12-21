// Proof service client for generating real Groth16 proofs

export interface ProofServiceConfig {
  url?: string;
  timeout?: number;
}

export interface ProofResponse {
  proof: string;
  public_inputs: string;
}

export interface ShieldRequest {
  commitment: string;
  amount: number;
}

export interface UnshieldRequest {
  nullifier: string;
  amount: number;
  recipient?: string;
}

export interface TransferRequest {
  nullifier: string;
  commitment: string;
  amount: number;
}

export class ProofServiceClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config?: ProofServiceConfig) {
    this.baseUrl = config?.url || process.env.PROOF_SERVICE_URL || "http://127.0.0.1:8080";
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

  async generateShieldProof(
    commitment: Uint8Array,
    amount: number
  ): Promise<ProofResponse> {
    const request: ShieldRequest = {
      commitment: Buffer.from(commitment).toString("hex"),
      amount,
    };

    const response = await fetch(`${this.baseUrl}/generate-proof/shield`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proof generation failed: ${response.status} ${errorText}`);
    }

    return await response.json() as ProofResponse;
  }

  async generateUnshieldProof(
    nullifier: Uint8Array,
    amount: number,
    recipient?: Uint8Array
  ): Promise<ProofResponse> {
    const request: UnshieldRequest = {
      nullifier: Buffer.from(nullifier).toString("hex"),
      amount,
      recipient: recipient ? Buffer.from(recipient).toString("hex") : undefined,
    };

    const response = await fetch(`${this.baseUrl}/generate-proof/unshield`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proof generation failed: ${response.status} ${errorText}`);
    }

    return await response.json() as ProofResponse;
  }

  async generateTransferProof(
    nullifier: Uint8Array,
    commitment: Uint8Array,
    amount: number
  ): Promise<ProofResponse> {
    const request: TransferRequest = {
      nullifier: Buffer.from(nullifier).toString("hex"),
      commitment: Buffer.from(commitment).toString("hex"),
      amount,
    };

    const response = await fetch(`${this.baseUrl}/generate-proof/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proof generation failed: ${response.status} ${errorText}`);
    }

    return await response.json() as ProofResponse;
  }
}

// Singleton instance
let defaultClient: ProofServiceClient | null = null;

export function getProofServiceClient(config?: ProofServiceConfig): ProofServiceClient {
  if (!defaultClient) {
    defaultClient = new ProofServiceClient(config);
  }
  return defaultClient;
}

