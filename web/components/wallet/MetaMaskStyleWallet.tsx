"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select as SelectComponent, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Key,
  History,
  Send,
  ArrowLeftRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  Coins
} from "lucide-react";
import { generateLocalWallet, saveLocalWallet, loadLocalWallet, walletToKeypair, type LocalWallet } from "@/lib/solana/wallet";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { useQuery } from "@tanstack/react-query";
import { formatAmount, formatSolBalance } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const sendSchema = z.object({
  type: z.enum(["ztoken", "sol", "token"]),
  commitment: z.string().optional(),
  token: z.string().optional(),
  recipient: z.string().min(32, "Invalid recipient address"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
});

type SendFormData = z.infer<typeof sendSchema>;

interface MetaMaskStyleWalletProps {
  onClose?: () => void;
}

export function MetaMaskStyleWallet({ onClose }: MetaMaskStyleWalletProps) {
  const [localWallet, setLocalWallet] = useState<LocalWallet | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendType, setSendType] = useState<"ztoken" | "sol" | "token">("sol");
  const [isSending, setIsSending] = useState(false);
  const { connection } = useConnection();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<SendFormData>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      type: "sol",
    },
  });

  useEffect(() => {
    setMounted(true);
    // Only load/create wallet once after mount
    let wallet = loadLocalWallet();
    
    // Auto-create wallet if none exists
    if (!wallet) {
      wallet = generateLocalWallet();
      saveLocalWallet(wallet);
    }
    
    setLocalWallet(wallet);
    // Empty dependency array ensures this only runs once
  }, []);

  const handleSend = async (data: SendFormData) => {
    if (!localWallet) return;
    
    setIsSending(true);
    try {
      const recipient = new PublicKey(data.recipient);
      const amount = parseFloat(data.amount);
      const keypair = walletToKeypair(localWallet);
      
      // Get current balances for validation
      const currentTokenBalances = tokenBalances || [];
      const currentZTokenBalances = zTokenBalances || [];

      if (data.type === "sol") {
        // Send SOL
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: recipient,
            lamports: amount * LAMPORTS_PER_SOL,
          })
        );

        const signature = await connection.sendTransaction(transaction, [keypair]);
        await connection.confirmTransaction(signature, "confirmed");

        toast({
          title: "SOL Sent",
          description: `Successfully sent ${amount} SOL`,
        });
      } else if (data.type === "token") {
        // Send SPL Token
        if (!data.token) {
          throw new Error("Please select a token");
        }
        const mint = new PublicKey(data.token);
        
        // Find the token in our balances to get decimals
        const tokenInfo = currentTokenBalances.find((t: any) => t.mint === data.token);
        if (!tokenInfo) {
          throw new Error("Token not found in your wallet");
        }
        
        // Check if user has enough balance
        const tokenAmount = BigInt(amount * Math.pow(10, tokenInfo.decimals));
        if (BigInt(tokenInfo.balance) < tokenAmount) {
          throw new Error(`Insufficient balance. You have ${formatAmount(tokenInfo.balance, tokenInfo.decimals)} tokens.`);
        }
        
        const sourceATA = await getAssociatedTokenAddress(mint, keypair.publicKey);
        const destATA = await getAssociatedTokenAddress(mint, recipient);

        const transaction = new Transaction().add(
          createTransferInstruction(
            sourceATA,
            destATA,
            keypair.publicKey,
            tokenAmount
          )
        );

        const signature = await connection.sendTransaction(transaction, [keypair]);
        await connection.confirmTransaction(signature, "confirmed");

        toast({
          title: "Token Sent",
          description: `Successfully sent ${amount} ${tokenInfo.symbol || "tokens"}`,
        });
      } else if (data.type === "ztoken") {
        // TODO: Implement zToken transfer (requires proof generation)
        if (!data.commitment) {
          throw new Error("Please select a zToken");
        }
        toast({
          title: "Coming Soon",
          description: "zToken transfers will be available soon",
        });
        return;
      }

      setShowSendDialog(false);
      reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyAddress = () => {
    if (localWallet) {
      navigator.clipboard.writeText(localWallet.publicKey);
    }
  };

  // Fetch SOL balance for local wallet
  const { data: solBalance } = useQuery({
    queryKey: ["solBalance", localWallet?.publicKey],
    queryFn: async () => {
      if (!localWallet) return 0;
      try {
        const keypair = walletToKeypair(localWallet);
        const balance = await connection.getBalance(keypair.publicKey);
        return balance / LAMPORTS_PER_SOL;
      } catch (error) {
        console.error("Error fetching SOL balance:", error);
        return 0;
      }
    },
    enabled: !!localWallet,
    refetchInterval: 5000,
  });
  const { data: tokenBalances } = useQuery({
    queryKey: ["tokenBalances", localWallet?.publicKey],
    queryFn: async () => {
      if (!localWallet) return [];
      try {
        const keypair = walletToKeypair(localWallet);
        // Fetch all token accounts owned by this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });
        
        return tokenAccounts.value.map((account) => {
          const parsedInfo = account.account.data.parsed.info;
          return {
            mint: parsedInfo.mint,
            balance: parsedInfo.tokenAmount.amount,
            decimals: parsedInfo.tokenAmount.decimals,
            symbol: parsedInfo.mint.slice(0, 4), // Placeholder - would need metadata
            name: "Token", // Placeholder - would need metadata
          };
        });
      } catch (error) {
        console.error("Error fetching token balances:", error);
        return [];
      }
    },
    enabled: !!localWallet,
    refetchInterval: 10000,
  });
  const { data: zTokenBalances } = useQuery({
    queryKey: ["zTokenBalances", localWallet?.publicKey],
    queryFn: async () => {
      if (!localWallet) return [];
      const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL || "/api/indexer";
      try {
        // Use the correct API format: ?address=...&type=balance
        const response = await fetch(`${indexerUrl}?address=${localWallet.publicKey}&type=balance`);
        if (response.ok) {
          const data = await response.json();
          // API returns an array or object, normalize to array
          if (Array.isArray(data)) {
            return data;
          }
          // If it's an object with balances, convert to array format
          if (data && typeof data === "object") {
            return Object.entries(data).map(([mint, balance]: [string, any]) => ({
              mint,
              total: balance.total || balance.amount || 0,
              decimals: balance.decimals || 9,
              commitments: balance.commitments || [],
            }));
          }
          return [];
        }
      } catch (error) {
        // Silently fail if indexer is not available (expected in development)
        // Only log in development mode
        if (process.env.NODE_ENV === "development") {
          console.debug("Indexer not available, zToken balances will be empty");
        }
      }
      return [];
    },
    enabled: !!localWallet,
    refetchInterval: 10000,
    retry: false, // Don't retry if indexer is unavailable
  });

  const { data: transactions } = useQuery({
    queryKey: ["walletTransactions", localWallet?.publicKey],
    queryFn: async () => {
      if (!localWallet) return [];
      const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL || "/api/indexer";
      try {
        // Use the correct API format: ?address=...&type=transactions
        const response = await fetch(`${indexerUrl}?address=${localWallet.publicKey}&type=transactions`);
        if (response.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (error) {
        // Silently fail if indexer is not available (expected in development)
        // Only log in development mode
        if (process.env.NODE_ENV === "development") {
          console.debug("Indexer not available, transaction history will be empty");
        }
      }
      return [];
    },
    enabled: !!localWallet,
    refetchInterval: 10000,
    retry: false, // Don't retry if indexer is unavailable
  });

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  // Wallet should always exist after mount (auto-created if needed)
  // Show skeleton while loading, but wallet should be created by now
  if (!localWallet) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  // Wallet exists - show wallet icon that opens the panel
  return (
    <>
      <div className="relative">
        {/* Wallet Icon Button - Compact View */}
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 transition-all hover:scale-105"
          title={`${localWallet.publicKey.slice(0, 6)}...${localWallet.publicKey.slice(-4)}`}
        >
          <Wallet className="h-5 w-5" />
        </Button>
      </div>

      {/* Expanded Wallet Panel - MetaMask Style - Rendered via Portal to avoid z-index issues */}
      {isExpanded && mounted && typeof window !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-start justify-end pt-16 pr-4 pointer-events-auto"
          onClick={(e) => {
            // Close if clicking outside the panel, but not if send dialog is open
            if (e.target === e.currentTarget && !showSendDialog) {
              setIsExpanded(false);
            }
          }}
        >
          <div className="w-96 max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <Card className="border-2 shadow-2xl bg-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Account</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Development Wallet Warning */}
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                        Local Development Wallet
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-500">
                        This is a development wallet stored in your browser. <strong>Do NOT send real SOL or tokens to this address</strong> - they will be lost. This wallet is only for testing on local networks.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                        {localWallet.publicKey.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {localWallet.publicKey.slice(0, 6)}...{localWallet.publicKey.slice(-4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {solBalance !== undefined ? `${formatSolBalance(solBalance)} SOL` : "Loading..."}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyAddress}
                        className="h-8 w-8 p-0"
                        title="Copy Address"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const explorerUrl = `https://explorer.solana.com/address/${localWallet.publicKey}?cluster=custom&customUrl=http://127.0.0.1:8899`;
                          window.open(explorerUrl, "_blank");
                        }}
                        className="h-8 w-8 p-0"
                        title="View on Explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tabs for Assets and Activity */}
                <Tabs defaultValue="assets" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="assets">Assets</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>

                  <TabsContent value="assets" className="space-y-2 mt-4">
                    {/* SOL Balance */}
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            SOL
                          </div>
                          <div>
                            <div className="font-medium">Solana</div>
                            <div className="text-sm text-muted-foreground">SOL</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {solBalance !== undefined ? formatSolBalance(solBalance) : <Skeleton className="h-4 w-16" />}
                          </div>
                          <div className="text-sm text-muted-foreground">SOL</div>
                        </div>
                      </div>
                    </div>

                    {/* Token Balances */}
                    {tokenBalances?.map((token: any) => (
                      <div key={token.mint} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                              {token.symbol?.slice(0, 2) || "T"}
                            </div>
                            <div>
                              <div className="font-medium">{token.name || "Token"}</div>
                              <div className="text-sm text-muted-foreground">{token.symbol || token.mint.slice(0, 4)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatAmount(token.balance, token.decimals)}</div>
                            <div className="text-sm text-muted-foreground">{token.symbol || "TOK"}</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* zToken Balances */}
                    {zTokenBalances?.map((ztoken: any) => (
                      <div key={ztoken.mint} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              z
                            </div>
                            <div>
                              <div className="font-medium">z{ztoken.name || "Token"}</div>
                              <div className="text-sm text-muted-foreground">Private Token</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatAmount(ztoken.total, ztoken.decimals || 9)}</div>
                            <div className="text-sm text-muted-foreground">{ztoken.commitments?.length || 0} commitments</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!tokenBalances || tokenBalances.length === 0) && (!zTokenBalances || zTokenBalances.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No tokens found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-2 mt-4 max-h-96 overflow-y-auto">
                    {transactions && transactions.length > 0 ? (
                      transactions.map((tx: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {tx.type === "send" && <Send className="h-5 w-5 text-blue-500" />}
                              {tx.type === "receive" && <ArrowLeftRight className="h-5 w-5 text-green-500 rotate-180" />}
                              {tx.type === "shield" && <ArrowLeftRight className="h-5 w-5 text-purple-500" />}
                              {tx.type === "unshield" && <ArrowLeftRight className="h-5 w-5 text-orange-500" />}
                              <div>
                                <div className="font-medium capitalize">{tx.type || "Transaction"}</div>
                                <div className="text-sm text-muted-foreground">
                                  {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "Recent"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${tx.amount?.startsWith("-") ? "text-red-500" : "text-green-500"}`}>
                                {tx.amount || "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {tx.status || "Confirmed"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No transactions yet</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setShowSendDialog(true);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setIsExpanded(false);
                      window.location.href = "/dashboard/wrap";
                    }}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Wrap
                  </Button>
                </div>

                {/* Private Key Section */}
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      {showPrivateKey ? "Hide" : "Show"} Private Key
                    </span>
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {showPrivateKey && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <div className="text-xs font-mono break-all text-muted-foreground">
                        {localWallet.secretKey}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(localWallet.secretKey);
                        }}
                        className="mt-2 w-full"
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Private Key
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>,
        document.body
      )}

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSendDialog(false);
        }
      }}>
        <DialogContent 
          className="sm:max-w-md z-[999999]"
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking on tabs or other interactive elements
            const target = e.target as HTMLElement;
            if (target.closest('[role="tab"]') || target.closest('[role="tablist"]') || target.closest('button') || target.closest('input') || target.closest('select')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Send</DialogTitle>
            <DialogDescription>
              Send SOL, tokens, or zTokens to another address
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSend)} className="space-y-4" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <Tabs value={sendType} onValueChange={(v) => {
              const newType = v as "ztoken" | "sol" | "token";
              setSendType(newType);
              setValue("type", newType);
            }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <TabsList className="grid w-full grid-cols-3" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <TabsTrigger value="sol" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Wallet className="h-4 w-4 mr-2" />
                  SOL
                </TabsTrigger>
                <TabsTrigger value="token" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Coins className="h-4 w-4 mr-2" />
                  Token
                </TabsTrigger>
                <TabsTrigger value="ztoken" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <Shield className="h-4 w-4 mr-2" />
                  zToken
                </TabsTrigger>
              </TabsList>

              <TabsContent value="token" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Token</label>
                  {tokenBalances && tokenBalances.length > 0 ? (
                    <SelectComponent
                      onValueChange={(value) => {
                        setValue("token", value);
                      }}
                    >
                      <SelectTrigger className="h-12 bg-background/50 backdrop-blur-sm border-2">
                        <SelectValue placeholder="Select a token to send" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokenBalances.map((token: any) => (
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
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectComponent>
                  ) : (
                    <div className="p-4 border rounded-lg text-center text-sm text-muted-foreground">
                      No tokens found. Mint some tokens first.
                    </div>
                  )}
                  {errors.token && (
                    <p className="text-sm text-destructive">{errors.token.message}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ztoken" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select zToken</label>
                  {zTokenBalances && zTokenBalances.length > 0 ? (
                    <SelectComponent
                      onValueChange={(value) => {
                        setValue("commitment", value);
                      }}
                    >
                      <SelectTrigger className="h-12 bg-background/50 backdrop-blur-sm border-2">
                        <SelectValue placeholder="Select a zToken to send" />
                      </SelectTrigger>
                      <SelectContent>
                        {zTokenBalances.map((ztoken: any) => (
                          <SelectItem key={ztoken.mint} value={ztoken.mint}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                  z
                                </div>
                                <div>
                                  <div className="font-medium">z{ztoken.name || "Token"}</div>
                                  <div className="text-xs text-muted-foreground">{ztoken.mint.slice(0, 8)}...</div>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="font-semibold">{formatAmount(ztoken.total, ztoken.decimals || 9)}</div>
                                <div className="text-xs text-muted-foreground">{ztoken.commitments?.length || 0} commitments</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectComponent>
                  ) : (
                    <div className="p-4 border rounded-lg text-center text-sm text-muted-foreground">
                      No zTokens found. Shield some tokens first.
                    </div>
                  )}
                  {errors.commitment && (
                    <p className="text-sm text-destructive">{errors.commitment.message}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Address</label>
              <Input
                placeholder="Enter recipient address"
                {...register("recipient")}
              />
              {errors.recipient && (
                <p className="text-sm text-destructive">{errors.recipient.message}</p>
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

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSendDialog(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isSending}
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
