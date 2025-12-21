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
import { Progress } from "@/components/ui/progress";
import { ArrowLeftRight } from "lucide-react";

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
    <div className="max-w-2xl mx-auto">
      <GradientCard gradient="blue" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <ArrowLeftRight className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Unshield Tokens</h2>
              <p className="text-sm text-muted-foreground">
                Convert zTokens back into public tokens
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              {errors.commitment && (
                <p className="text-sm text-destructive">{errors.commitment.message}</p>
              )}
            </div>

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

            {isLoading && (
              <div className="space-y-3 p-4 rounded-xl bg-background/50 backdrop-blur-sm border-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Step {currentStep + 1} of {STEPS.length}</span>
                  <span className="text-blue-400">{STEPS[currentStep]}</span>
                </div>
                <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-2" />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 glow-hover transition-all" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                <>
                  <ArrowLeftRight className="mr-2 h-5 w-5" />
                  Unshield Tokens
                </>
              )}
            </Button>
          </form>
        </div>
      </GradientCard>
    </div>
  );
}

