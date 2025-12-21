"use client";

import { SendForm } from "@/components/send/SendForm";

export default function SendPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Send</h1>
        <p className="text-muted-foreground">
          Send zTokens, SOL, or tokens to another address
        </p>
      </div>
      <SendForm />
    </div>
  );
}

