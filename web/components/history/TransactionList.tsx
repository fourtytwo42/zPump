"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalWallet } from "@/hooks/useLocalWallet";

export function TransactionList() {
  const { publicKey } = useWallet();
  const { walletAddress, mounted } = useLocalWallet();

  const finalWalletAddress = publicKey?.toBase58() || (mounted ? walletAddress : null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", finalWalletAddress],
    queryFn: async () => {
      if (!finalWalletAddress) return [];
      
      try {
        // Use Next.js API route to proxy to indexer
        const response = await fetch(
          `/api/indexer?address=${finalWalletAddress}&type=transactions`
        );
        if (response.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
      return [];
    },
    enabled: !!finalWalletAddress,
    refetchInterval: 10000,
  });

  if (!finalWalletAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Wallet Connected</CardTitle>
          <CardDescription>
            Connect a wallet to view transaction history
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>Your transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Search transactions..." className="flex-1" />
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="shield">Shield</SelectItem>
                <SelectItem value="unshield">Unshield</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any, i: number) => (
                <div key={i} className="border rounded p-4">
                  <div className="flex justify-between">
                    <span className="font-medium">{tx.type}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {tx.signature && (
                      <a
                        href={`https://solscan.io/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

