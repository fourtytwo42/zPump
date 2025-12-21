import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_VERIFIER_URL =
  process.env.EXTERNAL_VERIFIER_URL || "http://127.0.0.1:8081";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proof, publicInputs, verifyingKey } = body;

    const response = await fetch(`${EXTERNAL_VERIFIER_URL}/verify-proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proof,
        public_inputs: publicInputs,
        verifying_key: verifyingKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Verification failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

