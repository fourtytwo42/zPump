"use client";

import { TransactionList } from "@/components/history/TransactionList";
import { History } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
            <History className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text-primary">Transaction History</h1>
            <p className="text-muted-foreground text-lg">
              View all your on-chain and off-chain transactions
            </p>
          </div>
        </div>
      </div>
      <TransactionList />
    </div>
  );
}

