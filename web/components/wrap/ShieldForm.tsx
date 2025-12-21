"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GradientCard } from "@/components/ui/gradient-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { loadLocalWallet, walletToKeypair } from "@/lib/solana/wallet";
import { PublicKey } from "@solana/web3.js";
import { Shield } from "lucide-react";

const shieldSchema = z.object({
  token: z.string().min(1, "Token is required"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
});

type ShieldFormData = z.infer<typeof shieldSchema>;

export function ShieldForm() {
  const { toast } = useToast();
  const { publicKey, signTransaction } = useWallet();
  const localWallet = loadLocalWallet();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ShieldFormData>({
    resolver: zodResolver(shieldSchema),
  });

  const onSubmit = async (data: ShieldFormData) => {
    if (!publicKey && !localWallet) {
      toast({
        title: "Wallet Required",
        description: "Please connect a wallet to continue",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement shield operation
      // 1. Generate proof via API
      // 2. Build transaction
      // 3. Sign and send
      
      toast({
        title: "Shield Initiated",
        description: "Your shield operation is being processed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to shield tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <GradientCard gradient="purple" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Shield Tokens</h2>
              <p className="text-sm text-muted-foreground">
                Convert public tokens into privacy-preserving zTokens
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <span>Token</span>
              </label>
              <Select onValueChange={(value) => setValue("token", value)}>
                <SelectTrigger className="h-12 bg-background/50 backdrop-blur-sm border-2">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  {/* Add more tokens dynamically */}
                </SelectContent>
              </Select>
              {errors.token && (
                <p className="text-sm text-destructive">{errors.token.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="text"
                placeholder="0.00"
                className="h-12 bg-background/50 backdrop-blur-sm border-2 text-lg"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 glow-hover transition-all" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Shield Tokens
                </>
              )}
            </Button>
          </form>
        </div>
      </GradientCard>
    </div>
  );
}

