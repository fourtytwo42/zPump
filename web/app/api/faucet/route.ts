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

    console.log(`[Faucet API] Received request body:`, JSON.stringify(body));
    console.log(`[Faucet API] Amount type: ${typeof amount}, value: ${amount}`);

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Ensure amount is a number - handle both string and number inputs
    let requestedAmount: number;
    if (typeof amount === "string") {
      requestedAmount = parseFloat(amount);
    } else if (typeof amount === "number") {
      requestedAmount = amount;
    } else {
      return NextResponse.json(
        { error: `Invalid amount type: ${typeof amount}. Expected number or string.` },
        { status: 400 }
      );
    }

    console.log(`[Faucet API] Parsed requestedAmount: ${requestedAmount}, type: ${typeof requestedAmount}`);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: `Invalid amount. Must be a positive number. Got: ${amount} (${typeof amount}) -> ${requestedAmount}` },
        { status: 400 }
      );
    }
    if (requestedAmount > 10) {
      return NextResponse.json(
        { error: "Maximum 10 SOL per request" },
        { status: 400 }
      );
    }

    const recipient = new PublicKey(address);

    // For localnet, we can airdrop directly
    // Check both NEXT_PUBLIC_NETWORK and NODE_ENV for localnet
    // Default to localnet if not explicitly set to something else
    const isLocalnet = 
      process.env.NEXT_PUBLIC_NETWORK === "localnet" || 
      process.env.NODE_ENV === "development" ||
      !process.env.NEXT_PUBLIC_NETWORK; // Default to localnet if not set
    
    console.log(`[Faucet] Network check - NEXT_PUBLIC_NETWORK: ${process.env.NEXT_PUBLIC_NETWORK}, NODE_ENV: ${process.env.NODE_ENV}, isLocalnet: ${isLocalnet}`);
    
    if (isLocalnet) {
      // Convert SOL to lamports - ensure we use the correct constant
      // LAMPORTS_PER_SOL is 1,000,000,000 (1 billion)
      const lamports = Math.floor(requestedAmount * LAMPORTS_PER_SOL);
      
      console.log(`[Faucet] Raw values - requestedAmount: ${requestedAmount}, type: ${typeof requestedAmount}`);
      console.log(`[Faucet] LAMPORTS_PER_SOL: ${LAMPORTS_PER_SOL}`);
      console.log(`[Faucet] Calculation: ${requestedAmount} * ${LAMPORTS_PER_SOL} = ${requestedAmount * LAMPORTS_PER_SOL}`);
      console.log(`[Faucet] Math.floor result: ${lamports}`);
      console.log(`[Faucet] Requesting ${requestedAmount} SOL (${lamports} lamports) for ${address}`);
      
      if (lamports <= 0 || lamports < LAMPORTS_PER_SOL * 0.1) {
        return NextResponse.json(
          { error: `Invalid lamports calculation: ${lamports}. Amount: ${requestedAmount}, LAMPORTS_PER_SOL: ${LAMPORTS_PER_SOL}. This seems too small.` },
          { status: 400 }
        );
      }
      
      // Get balance before airdrop
      const balanceBefore = await connection.getBalance(recipient);
      console.log(`[Faucet] Balance before: ${balanceBefore} lamports (${balanceBefore / LAMPORTS_PER_SOL} SOL)`);
      
      // Try using the faucet port first (more reliable for localnet)
      let signature: string;
      const faucetPort = process.env.FAUCET_PORT || "9900";
      const faucetUrl = `http://127.0.0.1:${faucetPort}`;
      
      try {
        console.log(`[Faucet] Attempting faucet port airdrop at ${faucetUrl}`);
        const faucetResponse = await fetch(`${faucetUrl}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lamports: lamports,
            to: address,
          }),
        });
        
        if (faucetResponse.ok) {
          const faucetData = await faucetResponse.json();
          signature = faucetData.signature || faucetData.txid;
          console.log(`[Faucet] Faucet port airdrop successful: ${signature}`);
        } else {
          throw new Error(`Faucet port returned ${faucetResponse.status}`);
        }
      } catch (faucetError: any) {
        console.log(`[Faucet] Faucet port failed: ${faucetError.message}, falling back to RPC airdrop`);
        // Fallback to RPC airdrop
        console.log(`[Faucet] Calling requestAirdrop with ${lamports} lamports`);
        signature = await connection.requestAirdrop(recipient, lamports);
        console.log(`[Faucet] RPC airdrop signature: ${signature}`);
      }
      
      // Wait for confirmation with timeout
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      // Verify the balance was actually updated
      const balanceAfter = await connection.getBalance(recipient);
      const actualReceived = balanceAfter - balanceBefore;
      
      console.log(`[Faucet] Balance after: ${balanceAfter} lamports (${balanceAfter / LAMPORTS_PER_SOL} SOL)`);
      console.log(`[Faucet] Expected: ${lamports} lamports, Actual received: ${actualReceived} lamports`);
      
      if (actualReceived < lamports * 0.9) {
        console.error(`[Faucet] ERROR: Only received ${actualReceived} lamports (${actualReceived / LAMPORTS_PER_SOL} SOL) instead of ${lamports} lamports (${requestedAmount} SOL)!`);
        console.error(`[Faucet] This suggests the validator is limiting airdrops. Transaction signature: ${signature}`);
        // Return error so user knows something is wrong
        return NextResponse.json(
          { 
            error: `Airdrop completed but only received ${actualReceived / LAMPORTS_PER_SOL} SOL instead of ${requestedAmount} SOL. The validator may be limiting airdrops.`,
            signature,
            amount: requestedAmount,
            lamports,
            balanceAfter: balanceAfter / LAMPORTS_PER_SOL,
            actualReceived: actualReceived / LAMPORTS_PER_SOL,
          },
          { status: 500 }
        );
      }
      
      console.log(`[Faucet] Transaction confirmed. Sent ${requestedAmount} SOL (${lamports} lamports)`);
      
      return NextResponse.json({
        success: true,
        signature,
        amount: requestedAmount,
        lamports,
        balanceAfter: balanceAfter / LAMPORTS_PER_SOL,
        actualReceived: actualReceived / LAMPORTS_PER_SOL,
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

