"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GradientCard } from "@/components/ui/gradient-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { Droplets } from "lucide-react";
import { useLocalWallet } from "@/hooks/useLocalWallet";
import { useQueryClient } from "@tanstack/react-query";

const faucetSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
});

type FaucetFormData = z.infer<typeof faucetSchema>;

export default function FaucetPage() {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const { walletAddress: localWalletAddress, mounted } = useLocalWallet();
  const queryClient = useQueryClient();

  const walletAddress = publicKey?.toBase58() || (mounted ? localWalletAddress : null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FaucetFormData>({
    resolver: zodResolver(faucetSchema),
    defaultValues: {
      amount: "1",
    },
  });

  const onSubmit = async (data: FaucetFormData) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect a wallet to request SOL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const amountValue = parseFloat(data.amount);
      console.log(`[Faucet Page] Requesting ${amountValue} SOL for ${walletAddress}`);
      
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Invalid amount. Please enter a positive number.");
      }
      
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          amount: amountValue,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to request SOL");
      }

      // Invalidate balance queries to refresh the balance
      if (walletAddress) {
        queryClient.invalidateQueries({ queryKey: ["solBalance"] });
        queryClient.invalidateQueries({ queryKey: ["transactions", walletAddress] });
      }

      toast({
        title: "SOL Requested",
        description: `${data.amount} SOL has been sent! Transaction: ${result.signature?.slice(0, 8)}...${result.signature?.slice(-8)}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request SOL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Droplets className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text-primary">SOL Faucet</h1>
            <p className="text-muted-foreground text-lg">
              Request SOL for testing on the local validator
            </p>
          </div>
        </div>
      </div>

      <GradientCard gradient="blue" className="max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Request SOL</h2>
            <p className="text-sm text-muted-foreground">
              Get SOL for testing. Rate limited to prevent abuse.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (SOL)</label>
              <Input
                type="text"
                placeholder="1.0"
                className="h-12 bg-background/50 backdrop-blur-sm border-2 text-lg"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum: 10 SOL per request
              </p>
            </div>

            {walletAddress && (
              <div className="text-sm text-muted-foreground">
                Recipient: {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 glow-hover transition-all" 
              disabled={isLoading || !walletAddress}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Requesting...
                </span>
              ) : (
                <>
                  <Droplets className="mr-2 h-5 w-5" />
                  Request SOL
                </>
              )}
            </Button>
          </form>
        </div>
      </GradientCard>
    </div>
  );
}

