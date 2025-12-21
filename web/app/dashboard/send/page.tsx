"use client";

import { SendForm } from "@/components/send/SendForm";
import { Send } from "lucide-react";

export default function SendPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Send className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text-primary">Send</h1>
            <p className="text-muted-foreground text-lg">
              Send zTokens, SOL, or tokens to another address
            </p>
          </div>
        </div>
      </div>
      <SendForm />
    </div>
  );
}

