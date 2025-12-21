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
import { Progress } from "@/components/ui/progress";

const unshieldSchema = z.object({
  commitment: z.string().min(1, "Commitment is required"),
  recipient: z.string().min(32, "Invalid recipient address"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
});

type UnshieldFormData = z.infer<typeof unshieldSchema>;

const STEPS = [
  "Prepare Unshield",
  "Generate Proof",
  "Update Operation",
  "Verify Attestation",
  "Execute Unshield",
];

export function UnshieldForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<UnshieldFormData>({
    resolver: zodResolver(unshieldSchema),
  });

  const onSubmit = async (data: UnshieldFormData) => {
    setIsLoading(true);
    try {
      // Multi-step unshield flow
      for (let i = 0; i < STEPS.length; i++) {
        setCurrentStep(i);
        // TODO: Implement each step
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate
      }
      
      toast({
        title: "Unshield Complete",
        description: "Your tokens have been unshielded",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unshield tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setCurrentStep(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unshield Tokens</CardTitle>
        <CardDescription>
          Convert zTokens back into public tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {errors.commitment && (
              <p className="text-sm text-destructive">{errors.commitment.message}</p>
            )}
          </div>

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

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Step {currentStep + 1} of {STEPS.length}</span>
                <span>{STEPS[currentStep]}</span>
              </div>
              <Progress value={((currentStep + 1) / STEPS.length) * 100} />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Unshield Tokens"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

