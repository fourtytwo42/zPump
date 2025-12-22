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
import { walletToKeypair } from "@/lib/solana/wallet";
import { PublicKey } from "@solana/web3.js";
import { Shield } from "lucide-react";
import { useLocalWallet } from "@/hooks/useLocalWallet";
import { useQuery } from "@tanstack/react-query";
import { connection } from "@/lib/solana/connection";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { formatAmount, formatSolBalance } from "@/lib/utils";
import { Transaction } from "@solana/web3.js";

const shieldSchema = z.object({
  token: z.string().min(1, "Token is required"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
});

type ShieldFormData = z.infer<typeof shieldSchema>;

export function ShieldForm() {
  const { toast } = useToast();
  const { publicKey, signTransaction } = useWallet();
  const { wallet: localWallet } = useLocalWallet();
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

  // Fetch SOL balance
  const { data: solBalance } = useQuery({
    queryKey: ["solBalance", localWallet?.publicKey],
    queryFn: async () => {
      if (!localWallet) return 0;
      const keypair = walletToKeypair(localWallet);
      const balance = await connection.getBalance(keypair.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    },
    enabled: !!localWallet,
    refetchInterval: 10000,
  });

  // Fetch token balances
  const { data: tokenBalances } = useQuery({
    queryKey: ["tokenBalances", localWallet?.publicKey],
    queryFn: async () => {
      if (!localWallet) return [];
      try {
        const keypair = walletToKeypair(localWallet);
        // Lazy load metadata fetching function
        const { fetchTokenMetadata } = await import("@/lib/tokens/fetch-token-metadata");
        
        // Fetch all token accounts for both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID
        const [standardTokens, token2022Tokens] = await Promise.all([
          connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
            programId: TOKEN_PROGRAM_ID,
          }),
          connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
            programId: TOKEN_2022_PROGRAM_ID,
          }),
        ]);

        // Combine both token types and filter out zero balances
        const allTokens = [...standardTokens.value, ...token2022Tokens.value];

        // Process tokens and fetch metadata in parallel
        const tokenPromises = allTokens
          .filter((account) => {
            // Only include tokens with non-zero balance
            const parsedInfo = account.account.data.parsed.info;
            return BigInt(parsedInfo.tokenAmount.amount) > BigInt(0);
          })
          .map(async (account) => {
            const parsedInfo = account.account.data.parsed.info;
            const balance = BigInt(parsedInfo.tokenAmount.amount);
            const decimals = parsedInfo.tokenAmount.decimals;
            const displayBalance = Number(balance) / Math.pow(10, decimals);
            const mint = new PublicKey(parsedInfo.mint);

            // Fetch metadata for Token-2022 tokens (or any token with stored metadata)
            let metadata = null;
            try {
              metadata = await fetchTokenMetadata(mint, connection);
            } catch (error) {
              // Silently fail - use defaults
              console.debug(`Failed to fetch metadata for ${mint.toBase58()}:`, error);
            }

            return {
              mint: parsedInfo.mint,
              balance: parsedInfo.tokenAmount.amount,
              decimals: parsedInfo.tokenAmount.decimals,
              displayBalance,
              symbol: metadata?.symbol || parsedInfo.mint.slice(0, 4),
              name: metadata?.name || "Token",
              image: metadata?.image || "",
            };
          });

        return Promise.all(tokenPromises);
      } catch (error) {
        console.error("Error fetching token balances:", error);
        return [];
      }
    },
    enabled: !!localWallet,
    refetchInterval: 10000,
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
      const wallet = localWallet || (publicKey ? { publicKey: publicKey.toBase58() } : null);
      if (!wallet) {
        throw new Error("No wallet available");
      }

      const keypair = walletToKeypair(localWallet!);
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      // Determine if SOL or token
      const isSOL = data.token === "SOL";
      const mint = isSOL ? null : new PublicKey(data.token);

      // Convert amount to lamports/smallest unit
      let amountInSmallestUnit: bigint;
      if (isSOL) {
        amountInSmallestUnit = BigInt(Math.floor(amount * 1e9)); // Convert SOL to lamports
      } else {
        // Find token decimals
        const tokenInfo = tokenBalances?.find((t: any) => t.mint === data.token);
        if (!tokenInfo) {
          throw new Error("Token not found");
        }
        const decimals = tokenInfo.decimals;
        amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, decimals)));
        
        // Check balance
        if (BigInt(tokenInfo.balance) < amountInSmallestUnit) {
          throw new Error("Insufficient token balance");
        }
      }

      // Step 1: Generate commitment (random 32 bytes)
      const commitment = new Uint8Array(32);
      crypto.getRandomValues(commitment);

      // Step 2: Calculate operation ID (same as program does)
      // operation_id = hash(amount.to_le_bytes() + commitment)
      const amountBytes = new Uint8Array(8);
      const amountView = new DataView(amountBytes.buffer);
      amountView.setBigUint64(0, amountInSmallestUnit, true); // little-endian
      const operationIdData = new Uint8Array(8 + 32);
      operationIdData.set(amountBytes, 0);
      operationIdData.set(commitment, 8);
      
      // Simple hash (matches program's hash_operation_id)
      const operationId = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        operationId[i] = operationIdData[i % operationIdData.length] ^ operationIdData[(i + 1) % operationIdData.length];
      }

      // Step 3: Check if proof vault exists and close it if it has wrong discriminator
      const { Program, AnchorProvider } = await import("@coral-xyz/anchor");
      const { SystemProgram } = await import("@solana/web3.js");
      const { POOL_PROGRAM_ID } = await import("@/lib/solana/programs");
      
      // Create a wallet object that implements the Anchor Wallet interface
      const anchorWallet = {
        publicKey: keypair.publicKey,
        signTransaction: async (tx: Transaction): Promise<Transaction> => {
          tx.sign(keypair);
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]): Promise<Transaction[]> => {
          return txs.map(tx => {
            tx.sign(keypair);
            return tx;
          });
        },
      } as any; // Type assertion to match Anchor Wallet interface
      
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const idlModule = await import("../../app/idl/ptf_pool.json");
      const idl = idlModule.default as any;
      const program = new Program(idl, provider) as any;

      // Check if proof vault account exists
      const proofVault = PublicKey.findProgramAddressSync(
        [Buffer.from("proof-vault"), keypair.publicKey.toBuffer()],
        POOL_PROGRAM_ID
      )[0];

      const proofVaultInfo = await connection.getAccountInfo(proofVault);
      
      // If account exists, check if it has the correct discriminator
      // If not, we need to handle it - but we can't close a PDA from frontend
      // The program should handle recreating it if needed
      if (proofVaultInfo && proofVaultInfo.data.length >= 8) {
        const discriminator = proofVaultInfo.data.slice(0, 8);
        const isAllZeros = discriminator.every(byte => byte === 0);
        
        // Expected discriminator for UserProofVault: SHA256("account:UserProofVault")[0:8]
        // Computed value: [0x82, 0x02, 0xe0, 0x9a, 0x26, 0x81, 0x9e, 0xa0]
        const expectedDiscriminator = new Uint8Array([0x82, 0x02, 0xe0, 0x9a, 0x26, 0x81, 0x9e, 0xa0]);
        const hasCorrectDiscriminator = discriminator.every((byte, i) => byte === expectedDiscriminator[i]);
        
        if (!isAllZeros && !hasCorrectDiscriminator) {
          // Account exists with wrong discriminator - this will cause Anchor validation to fail
          // We can't close a PDA from frontend, so we need to work around this
          // The program should handle this, but Anchor validates before our code runs
          console.warn("Proof vault has wrong discriminator. This may cause the transaction to fail.");
          console.warn("Discriminator:", Array.from(discriminator).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', '));
          console.warn("Expected:", Array.from(expectedDiscriminator).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', '));
          
          // Try to proceed anyway - the program might be able to fix it
          // If it fails, the user will need to reset the validator
        }
      }

      // Build prepare shield transaction
      const prepareTx = await program.methods
        .prepareShield({
          amount: new (await import("@coral-xyz/anchor")).BN(Number(amountInSmallestUnit)),
          commitment: Array.from(commitment),
        })
        .accounts({
          payer: keypair.publicKey,
          proofVault: proofVault,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Step 4: Sign and send prepare transaction
      prepareTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      prepareTx.feePayer = keypair.publicKey;
      prepareTx.sign(keypair);

      toast({
        title: "Preparing Shield",
        description: "Sending prepare shield transaction...",
      });

      const prepareSig = await connection.sendRawTransaction(prepareTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(prepareSig, "confirmed");

      // Step 5: Generate proof
      toast({
        title: "Generating Proof",
        description: "Generating zero-knowledge proof...",
      });

      const proofResponse = await fetch("/api/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "shield",
          amount: Number(amountInSmallestUnit),
          commitment: Array.from(commitment),
        }),
      });

      if (!proofResponse.ok) {
        const errorText = await proofResponse.text();
        let errorMessage = "Failed to generate proof";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const { proof, public_inputs } = await proofResponse.json();
      const proofBytes = Uint8Array.from(Buffer.from(proof, "hex"));
      const publicInputsBytes = Uint8Array.from(Buffer.from(public_inputs, "hex"));

      // Step 6: Update operation data (proof + public_inputs)
      // (program and provider already created above)

      // Format operation data: [proof (256)][public_inputs (variable)]
      const operationData = new Uint8Array(256 + publicInputsBytes.length);
      operationData.set(proofBytes.slice(0, 256), 0);
      operationData.set(publicInputsBytes, 256);

      const updateTx = await program.methods
        .updateOperationData(
          Array.from(operationId),
          Array.from(operationData)
        )
        .accounts({
          payer: keypair.publicKey,
          proofVault: PublicKey.findProgramAddressSync(
            [Buffer.from("proof-vault"), keypair.publicKey.toBuffer()],
            POOL_PROGRAM_ID
          )[0],
        })
        .transaction();

      updateTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      updateTx.feePayer = keypair.publicKey;
      updateTx.sign(keypair);

      toast({
        title: "Updating Operation",
        description: "Updating operation data with proof...",
      });

      const updateSig = await connection.sendRawTransaction(updateTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(updateSig, "confirmed");

      // Step 7: Execute shield
      toast({
        title: "Executing Shield",
        description: "Executing shield operation...",
      });

      const executeTx = await program.methods
        .executeShieldV2(Array.from(operationId))
        .accounts({
          _phantom: PublicKey.default, // Phantom account for remaining_accounts
        })
        .transaction();

      executeTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      executeTx.feePayer = keypair.publicKey;
      executeTx.sign(keypair);

      const executeSig = await connection.sendRawTransaction(executeTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(executeSig, "confirmed");

      toast({
        title: "Shield Complete",
        description: `Successfully shielded ${amount} ${isSOL ? "SOL" : "tokens"}`,
      });
    } catch (error: any) {
      console.error("Shield error:", error);
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
              <Select 
                value={watch("token") || ""}
                onValueChange={(value) => setValue("token", value)}
              >
                <SelectTrigger className="h-12 bg-background/50 backdrop-blur-sm border-2">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* SOL option */}
                  {solBalance !== undefined && solBalance > 0 && (
                    <SelectItem value="SOL">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            SOL
                          </div>
                          <div className="font-medium">Solana</div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold">{formatSolBalance(solBalance)}</div>
                          <div className="text-xs text-muted-foreground">Available</div>
                        </div>
                      </div>
                    </SelectItem>
                  )}
                  {/* SPL Token options */}
                  {tokenBalances?.map((token: any) => (
                    <SelectItem key={token.mint} value={token.mint}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                            {token.symbol?.slice(0, 2) || "T"}
                          </div>
                          <div>
                            <div className="font-medium">{token.name || "Token"}</div>
                            <div className="text-xs text-muted-foreground">{token.symbol || token.mint.slice(0, 8)}...</div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold">{formatAmount(token.balance, token.decimals)}</div>
                          <div className="text-xs text-muted-foreground">Available</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
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

