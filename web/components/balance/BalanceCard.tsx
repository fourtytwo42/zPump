"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSolBalance, useTokenBalance, useZTokenBalance } from "@/hooks/useBalances";
import { PublicKey } from "@solana/web3.js";
import { Skeleton } from "@/components/ui/skeleton";

interface BalanceCardProps {
  title: string;
  mint?: PublicKey | null | undefined;
  type?: "sol" | "token" | "ztoken";
}

export function BalanceCard({ title, mint, type = "sol" }: BalanceCardProps) {
  const solBalance = useSolBalance();
  const tokenBalance = useTokenBalance(type === "token" ? mint : null);
  const zTokenBalance = useZTokenBalance(type === "ztoken" ? mint : null);

  const getBalance = () => {
    if (type === "sol") {
      if (solBalance.isLoading) return <Skeleton className="h-6 w-20" />;
      if (solBalance.error) return "Error";
      return `${solBalance.data?.toFixed(4) || 0} SOL`;
    }
    if (type === "token") {
      if (tokenBalance.isLoading) return <Skeleton className="h-6 w-20" />;
      if (tokenBalance.error) return "Error";
      const amount = tokenBalance.data?.amount || 0;
      const decimals = tokenBalance.data?.decimals || 9;
      return `${(amount / Math.pow(10, decimals)).toFixed(4)}`;
    }
    if (type === "ztoken") {
      if (zTokenBalance.isLoading) return <Skeleton className="h-6 w-20" />;
      if (zTokenBalance.error) return "Error";
      return `${zTokenBalance.data?.total || 0} zTokens`;
    }
    return "0";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {type === "sol" && "Your SOL balance"}
          {type === "token" && "Your token balance"}
          {type === "ztoken" && "Your private token balance"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{getBalance()}</div>
      </CardContent>
    </Card>
  );
}

