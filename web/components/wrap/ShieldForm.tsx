"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { loadLocalWallet, walletToKeypair } from "@/lib/solana/wallet";
import { PublicKey } from "@solana/web3.js";

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
    <Card>
      <CardHeader>
        <CardTitle>Shield Tokens</CardTitle>
        <CardDescription>
          Convert public tokens into privacy-preserving zTokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Token</label>
            <Select onValueChange={(value) => setValue("token", value)}>
              <SelectTrigger>
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
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Shield Tokens"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

