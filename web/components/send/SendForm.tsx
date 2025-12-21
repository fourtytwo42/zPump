"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GradientCard } from "@/components/ui/gradient-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, Shield, Wallet, Coins } from "lucide-react";

const sendSchema = z.object({
  type: z.enum(["ztoken", "sol", "token"]),
  commitment: z.string().optional(),
  token: z.string().optional(),
  recipient: z.string().min(32, "Invalid recipient address"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
});

type SendFormData = z.infer<typeof sendSchema>;

export function SendForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sendType, setSendType] = useState<"ztoken" | "sol" | "token">("ztoken");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SendFormData>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      type: "ztoken",
    },
  });

  const onSubmit = async (data: SendFormData) => {
    setIsLoading(true);
    try {
      // TODO: Implement send operation based on type
      toast({
        title: "Send Initiated",
        description: "Your transaction is being processed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <GradientCard gradient="pink" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-cyan-500/20">
              <Send className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Send</h2>
              <p className="text-sm text-muted-foreground">
                Send zTokens, SOL, or tokens to another address
              </p>
            </div>
          </div>

          <Tabs value={sendType} onValueChange={(v) => setSendType(v as typeof sendType)}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl mb-6">
              <TabsTrigger 
                value="ztoken"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Shield className="h-4 w-4 mr-2" />
                zToken
              </TabsTrigger>
              <TabsTrigger 
                value="sol"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Wallet className="h-4 w-4 mr-2" />
                SOL
              </TabsTrigger>
              <TabsTrigger 
                value="token"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Coins className="h-4 w-4 mr-2" />
                Token
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="ztoken" className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">zToken Commitment</label>
                  <Select onValueChange={(value) => setValue("commitment", value)}>
                    <SelectTrigger className="h-12 bg-background/50 backdrop-blur-sm border-2">
                      <SelectValue placeholder="Select commitment" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Load commitments dynamically */}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="token" className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token</label>
                  <Select onValueChange={(value) => setValue("token", value)}>
                    <SelectTrigger className="h-12 bg-background/50 backdrop-blur-sm border-2">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Load tokens dynamically */}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Address</label>
                <Input
                  type="text"
                  placeholder="Enter recipient address"
                  className="h-12 bg-background/50 backdrop-blur-sm border-2"
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
                  className="h-12 bg-background/50 backdrop-blur-sm border-2 text-lg"
                  {...register("amount")}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 glow-hover transition-all" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send
                  </>
                )}
              </Button>
            </form>
          </Tabs>
        </div>
      </GradientCard>
    </div>
  );
}

