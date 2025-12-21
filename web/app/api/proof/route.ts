import { NextRequest, NextResponse } from "next/server";

const PROOF_SERVICE_URL =
  process.env.PROOF_SERVICE_URL || "http://127.0.0.1:8080";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, ...params } = body;

    let endpoint = "";
    if (operation === "shield") {
      endpoint = "/generate-shield-proof";
    } else if (operation === "unshield") {
      endpoint = "/generate-unshield-proof";
    } else if (operation === "transfer") {
      endpoint = "/generate-transfer-proof";
    } else {
      return NextResponse.json(
        { error: "Invalid operation" },
        { status: 400 }
      );
    }

    const response = await fetch(`${PROOF_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Proof generation failed" },
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

