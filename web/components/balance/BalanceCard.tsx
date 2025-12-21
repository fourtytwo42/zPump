"use client";

import { GradientCard } from "@/components/ui/gradient-card";
import { useSolBalance, useTokenBalance, useZTokenBalance } from "@/hooks/useBalances";
import { PublicKey } from "@solana/web3.js";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Coins, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  title: string;
  mint?: PublicKey | null | undefined;
  type?: "sol" | "token" | "ztoken";
  gradient?: "purple" | "blue" | "pink" | "green";
}

const iconMap = {
  sol: Wallet,
  token: Coins,
  ztoken: Shield,
};

const gradientMap = {
  sol: "blue" as const,
  token: "purple" as const,
  ztoken: "pink" as const,
};

export function BalanceCard({ 
  title, 
  mint, 
  type = "sol",
  gradient 
}: BalanceCardProps) {
  const solBalance = useSolBalance();
  const tokenBalance = useTokenBalance(type === "token" ? mint : null);
  const zTokenBalance = useZTokenBalance(type === "ztoken" ? mint : null);
  const Icon = iconMap[type];
  const cardGradient = gradient || gradientMap[type];

  const getBalance = () => {
    if (type === "sol") {
      if (solBalance.isLoading) return <Skeleton className="h-8 w-24" />;
      if (solBalance.error) return <span className="text-destructive">Error</span>;
      return `${solBalance.data?.toFixed(4) || 0} SOL`;
    }
    if (type === "token") {
      if (tokenBalance.isLoading) return <Skeleton className="h-8 w-24" />;
      if (tokenBalance.error) return <span className="text-destructive">Error</span>;
      const amount = tokenBalance.data?.amount || 0;
      const decimals = tokenBalance.data?.decimals || 9;
      return `${(amount / Math.pow(10, decimals)).toFixed(4)}`;
    }
    if (type === "ztoken") {
      if (zTokenBalance.isLoading) return <Skeleton className="h-8 w-24" />;
      if (zTokenBalance.error) return <span className="text-destructive">Error</span>;
      return `${zTokenBalance.data?.total || 0} zTokens`;
    }
    return "0";
  };

  return (
    <GradientCard gradient={cardGradient} className="relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={cn(
            "h-5 w-5 transition-colors",
            type === "sol" && "text-blue-400",
            type === "token" && "text-blue-400",
            type === "ztoken" && "text-indigo-400"
          )} />
        </div>
        <div className="text-3xl font-bold mb-1">{getBalance()}</div>
        <p className="text-xs text-muted-foreground">
          {type === "sol" && "Available balance"}
          {type === "token" && "Token balance"}
          {type === "ztoken" && "Private balance"}
        </p>
      </div>
    </GradientCard>
  );
}

