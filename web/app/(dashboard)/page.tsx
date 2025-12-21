"use client";

import { BalanceCard } from "@/components/balance/BalanceCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@solana/wallet-adapter-react";
import { loadLocalWallet } from "@/lib/solana/wallet";
import { PublicKey } from "@solana/web3.js";

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const localWallet = loadLocalWallet();
  const walletConnected = !!publicKey || !!localWallet;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your privacy tokens and transactions
        </p>
      </div>

      {!walletConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to view balances and manage your privacy tokens
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <BalanceCard title="SOL Balance" type="sol" />
          {/* Token balances will be dynamically loaded */}
        </div>
      )}
    </div>
  );
}

