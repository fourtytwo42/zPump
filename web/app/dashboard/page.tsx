"use client";

import { BalanceCard } from "@/components/balance/BalanceCard";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientCard } from "@/components/ui/gradient-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowRight, TrendingUp, Shield, Zap, Activity } from "lucide-react";
import Link from "next/link";
import { useSolBalance } from "@/hooks/useBalances";
import { useLocalWallet } from "@/hooks/useLocalWallet";

export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { wallet: localWallet, mounted } = useLocalWallet();

  const walletConnected = !!publicKey || (mounted && !!localWallet);
  const { data: solBalance } = useSolBalance();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold gradient-text-primary">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Manage your privacy tokens and transactions
        </p>
      </div>

      {!walletConnected ? (
        <GradientCard gradient="purple" className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-4 text-blue-400" />
          <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your wallet to view balances, shield tokens, and manage your privacy pool transactions
          </p>
          <Button size="lg" className="glow-hover">
            Connect Wallet
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </GradientCard>
      ) : (
        <>
          {/* Balance Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <BalanceCard title="SOL Balance" type="sol" />
            <GradientCard gradient="blue" className="flex flex-col justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Total zTokens</div>
                <div className="text-3xl font-bold">0</div>
              </div>
              <Shield className="h-8 w-8 text-blue-400 mt-4" />
            </GradientCard>
            <GradientCard gradient="pink" className="flex flex-col justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Shielded Value</div>
                <div className="text-3xl font-bold">
                  {solBalance ? `$${(solBalance * 100).toFixed(2)}` : "$0.00"}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-400 mt-4" />
            </GradientCard>
            <GradientCard gradient="green" className="flex flex-col justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Transactions</div>
                <div className="text-3xl font-bold">0</div>
              </div>
              <Activity className="h-8 w-8 text-green-400 mt-4" />
            </GradientCard>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlassCard variant="dark" className="group cursor-pointer hover:glow transition-all">
              <Link href="/dashboard/wrap">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="h-10 w-10 text-blue-400 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Shield & Unshield</h3>
                <p className="text-muted-foreground">
                  Convert your tokens to private zTokens and back
                </p>
              </Link>
            </GlassCard>

            <GlassCard variant="dark" className="group cursor-pointer hover:glow transition-all">
              <Link href="/dashboard/send">
                <div className="flex items-center justify-between mb-4">
                  <Shield className="h-10 w-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Private Transfer</h3>
                <p className="text-muted-foreground">
                  Send zTokens privately with zero-knowledge proofs
                </p>
              </Link>
            </GlassCard>

            <GlassCard variant="dark" className="group cursor-pointer hover:glow transition-all">
              <Link href="/dashboard/history">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="h-10 w-10 text-blue-400 group-hover:scale-110 transition-transform" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Transaction History</h3>
                <p className="text-muted-foreground">
                  View all your privacy pool transactions
                </p>
              </Link>
            </GlassCard>
          </div>

          {/* Recent Activity */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest privacy pool transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm mt-2">Start by shielding some tokens!</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

