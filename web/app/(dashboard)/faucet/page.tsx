"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { loadLocalWallet } from "@/lib/solana/wallet";

const faucetSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
});

type FaucetFormData = z.infer<typeof faucetSchema>;

export default function FaucetPage() {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const localWallet = loadLocalWallet();
  const walletAddress = publicKey?.toBase58() || localWallet?.publicKey;
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
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          amount: parseFloat(data.amount),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to request SOL");
      }

      toast({
        title: "SOL Requested",
        description: `${data.amount} SOL has been requested`,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SOL Faucet</h1>
        <p className="text-muted-foreground">
          Request SOL for testing on the local validator
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request SOL</CardTitle>
          <CardDescription>
            Get SOL for testing. Rate limited to prevent abuse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (SOL)</label>
              <Input
                type="text"
                placeholder="1.0"
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

            <Button type="submit" className="w-full" disabled={isLoading || !walletAddress}>
              {isLoading ? "Requesting..." : "Request SOL"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

