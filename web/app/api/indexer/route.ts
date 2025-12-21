import { NextRequest, NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || "http://127.0.0.1:8082";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const mint = searchParams.get("mint");
    const type = searchParams.get("type"); // balance, transactions

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    let endpoint = "";
    if (type === "balance") {
      endpoint = mint
        ? `/balance/${address}/${mint}`
        : `/balance/${address}`;
    } else if (type === "transactions") {
      endpoint = `/transactions/${address}`;
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'balance' or 'transactions'" },
        { status: 400 }
      );
    }

    const response = await fetch(`${INDEXER_URL}${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Indexer request failed" },
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

