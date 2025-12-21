"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { loadLocalWallet } from "@/lib/solana/wallet";

const createTokenSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  decimals: z.string().regex(/^\d+$/, "Invalid decimals"),
  initialSupply: z.string().regex(/^\d+(\.\d+)?$/, "Invalid supply"),
  token2022: z.boolean().optional().default(false),
});

const mintTokenSchema = z.object({
  mint: z.string().min(32, "Invalid mint address"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
  recipient: z.string().min(32, "Invalid recipient address"),
});

export default function MintPage() {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const localWallet = loadLocalWallet();
  const walletAddress = publicKey?.toBase58() || localWallet?.publicKey;
  const [isLoading, setIsLoading] = useState(false);

  const createForm = useForm({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: "",
      symbol: "",
      decimals: "9",
      initialSupply: "0",
      token2022: false,
    },
  });

  const mintForm = useForm<z.infer<typeof mintTokenSchema>>({
    resolver: zodResolver(mintTokenSchema),
  });

  const onCreateToken = async (data: z.infer<typeof createTokenSchema>) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect a wallet to create tokens",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement token creation
      toast({
        title: "Token Created",
        description: "Your token has been created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create token",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onMintToken = async (data: z.infer<typeof mintTokenSchema>) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect a wallet to mint tokens",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement token minting
      toast({
        title: "Tokens Minted",
        description: "Tokens have been minted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mint tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mint Tokens</h1>
        <p className="text-muted-foreground">
          Create new tokens or mint to existing tokens
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Token</TabsTrigger>
          <TabsTrigger value="mint">Mint to Token</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Token</CardTitle>
              <CardDescription>
                Create a new SPL token or Token-2022 token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createForm.handleSubmit(onCreateToken)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Name</label>
                  <Input {...createForm.register("name")} />
                  {createForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <Input {...createForm.register("symbol")} />
                  {createForm.formState.errors.symbol && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.symbol.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Decimals</label>
                  <Input {...createForm.register("decimals")} />
                  {createForm.formState.errors.decimals && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.decimals.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial Supply</label>
                  <Input {...createForm.register("initialSupply")} />
                  {createForm.formState.errors.initialSupply && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.initialSupply.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Token"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mint">
          <Card>
            <CardHeader>
              <CardTitle>Mint to Token</CardTitle>
              <CardDescription>
                Mint additional tokens to an existing token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={mintForm.handleSubmit(onMintToken)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mint Address</label>
                  <Input {...mintForm.register("mint")} />
                  {mintForm.formState.errors.mint && (
                    <p className="text-sm text-destructive">
                      {mintForm.formState.errors.mint.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input {...mintForm.register("amount")} />
                  {mintForm.formState.errors.amount && (
                    <p className="text-sm text-destructive">
                      {mintForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient Address</label>
                  <Input {...mintForm.register("recipient")} />
                  {mintForm.formState.errors.recipient && (
                    <p className="text-sm text-destructive">
                      {mintForm.formState.errors.recipient.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Minting..." : "Mint Tokens"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

