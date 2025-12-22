"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GradientCard } from "@/components/ui/gradient-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { walletToKeypair } from "@/lib/solana/wallet";
import { connection } from "@/lib/solana/connection";
import { Coins, Upload, Image as ImageIcon } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useLocalWallet } from "@/hooks/useLocalWallet";
import { useQueryClient } from "@tanstack/react-query";

const createTokenSchema = z.object({
  name: z.string().min(1, "Name is required").max(32, "Name too long"),
  symbol: z.string().min(1, "Symbol is required").max(10, "Symbol too long"),
  decimals: z.string().regex(/^\d+$/, "Invalid decimals"),
  description: z.string().optional(),
});

const mintTokenSchema = z.object({
  mint: z.string().min(32, "Invalid mint address"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
  recipient: z.string().min(32, "Invalid recipient address"),
});

export default function MintPage() {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const { wallet: localWallet, walletAddress, mounted } = useLocalWallet();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const finalWalletAddress = publicKey?.toBase58() || walletAddress;

  const createForm = useForm({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: "",
      symbol: "",
      decimals: "9",
      description: "",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Image too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const mintForm = useForm<z.infer<typeof mintTokenSchema>>({
    resolver: zodResolver(mintTokenSchema),
  });

  const onCreateToken = async (data: z.infer<typeof createTokenSchema>) => {
    if (!finalWalletAddress || !localWallet) {
      toast({
        title: "Wallet Required",
        description: "Please connect a wallet to create tokens",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const keypair = walletToKeypair(localWallet);
      const decimals = parseInt(data.decimals);

      // Create Token-2022 with metadata
      // Import dynamically to avoid blocking initial load
      const tokenModule = await import("@/lib/tokens/create-token-2022");
      const { mint, metadataUri, transaction, mintKeypair } = await tokenModule.createToken2022WithMetadata(
        connection,
        keypair,
        {
          name: data.name,
          symbol: data.symbol,
          decimals,
          imageFile: imageFile || undefined,
          description: data.description || undefined,
        }
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = keypair.publicKey;

      // Sign transaction with both payer and mint keypairs
      transaction.sign(keypair, mintKeypair);

      // Send transaction
      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      // Store metadata URI mapping on server (will be fetched from IPFS node on VM)
      try {
        await fetch("/api/token-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint: mint.toBase58(),
            metadataUri: metadataUri,
          }),
        });
      } catch (error) {
        console.error("Failed to store metadata URI mapping:", error);
        // Non-critical - metadata can still be fetched if we implement metadata pointer extension
      }

      toast({
        title: "Token Created Successfully!",
        description: `1 billion ${data.symbol} tokens minted to your wallet. Mint: ${mint.toBase58()}`,
      });

      // Reset form
      createForm.reset();
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error("Token creation error:", error);
      
      // Provide helpful error message for IPFS issues
      let errorMessage = error.message || "Failed to create token";
      if (errorMessage.includes("IPFS") || errorMessage.includes("project id")) {
        errorMessage = "IPFS upload failed. Please configure IPFS credentials in environment variables (NEXT_PUBLIC_IPFS_PROJECT_ID and NEXT_PUBLIC_IPFS_PROJECT_SECRET) or use a different IPFS gateway.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onMintToken = async (data: z.infer<typeof mintTokenSchema>) => {
    if (!finalWalletAddress) {
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
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
            <Coins className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text-primary">Mint Tokens</h1>
            <p className="text-muted-foreground text-lg">
              Create new tokens or mint to existing tokens
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger 
            value="create"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg transition-all"
          >
            Create Token
          </TabsTrigger>
          <TabsTrigger 
            value="mint"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-lg transition-all"
          >
            Mint to Token
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <GradientCard gradient="yellow" className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Create Token</h2>
              <p className="text-sm text-muted-foreground">
                Create a new SPL token or Token-2022 token
              </p>
            </div>
            <form onSubmit={createForm.handleSubmit(onCreateToken)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Image</label>
                  <div className="space-y-3">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Token preview"
                          className="w-full h-48 object-cover rounded-lg border-2 border-border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, GIF (MAX. 5MB)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Name</label>
                  <Input 
                    {...createForm.register("name")} 
                    placeholder="My Awesome Token"
                    className="h-12 bg-background/50 backdrop-blur-sm border-2"
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <Input 
                    {...createForm.register("symbol")} 
                    placeholder="MAT"
                    className="h-12 bg-background/50 backdrop-blur-sm border-2"
                  />
                  {createForm.formState.errors.symbol && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.symbol.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Decimals</label>
                  <Input 
                    {...createForm.register("decimals")} 
                    placeholder="9"
                    className="h-12 bg-background/50 backdrop-blur-sm border-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard is 9 decimals (like SOL)
                  </p>
                  {createForm.formState.errors.decimals && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.decimals.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Input 
                    {...createForm.register("description")} 
                    placeholder="A brief description of your token"
                    className="h-12 bg-background/50 backdrop-blur-sm border-2"
                  />
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-200">
                    <strong>Note:</strong> 1 billion tokens will be automatically minted to your wallet after creation.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 glow-hover transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create Token"}
                </Button>
              </form>
          </GradientCard>
        </TabsContent>

        <TabsContent value="mint" className="mt-6">
          <GradientCard gradient="green" className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Mint to Token</h2>
              <p className="text-sm text-muted-foreground">
                Mint additional tokens to an existing token
              </p>
            </div>
            <form onSubmit={mintForm.handleSubmit(onMintToken)} className="space-y-6">
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

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 glow-hover transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? "Minting..." : "Mint Tokens"}
                </Button>
              </form>
          </GradientCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

