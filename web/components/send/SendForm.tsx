"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

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
    <Card>
      <CardHeader>
        <CardTitle>Send</CardTitle>
        <CardDescription>
          Send zTokens, SOL, or tokens to another address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={sendType} onValueChange={(v) => setSendType(v as typeof sendType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ztoken">zToken</TabsTrigger>
            <TabsTrigger value="sol">SOL</TabsTrigger>
            <TabsTrigger value="token">Token</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <TabsContent value="ztoken" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">zToken Commitment</label>
                <Select onValueChange={(value) => setValue("commitment", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select commitment" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Load commitments dynamically */}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="token" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Token</label>
                <Select onValueChange={(value) => setValue("token", value)}>
                  <SelectTrigger>
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}

