import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection } from "@/lib/solana/connection";

// Faucet keypair - in production, this should be stored securely
// For localnet, we can use a well-known keypair
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, amount } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const requestedAmount = parseFloat(amount) || 1;
    if (requestedAmount > 10) {
      return NextResponse.json(
        { error: "Maximum 10 SOL per request" },
        { status: 400 }
      );
    }

    const recipient = new PublicKey(address);

    // For localnet, we can airdrop directly
    if (process.env.NEXT_PUBLIC_NETWORK === "localnet") {
      const signature = await connection.requestAirdrop(
        recipient,
        requestedAmount * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature);
      return NextResponse.json({
        success: true,
        signature,
        amount: requestedAmount,
      });
    }

    // For other networks, use a faucet keypair
    if (!FAUCET_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Faucet not configured" },
        { status: 500 }
      );
    }

    // TODO: Implement faucet with keypair
    return NextResponse.json(
      { error: "Faucet not implemented for this network" },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

