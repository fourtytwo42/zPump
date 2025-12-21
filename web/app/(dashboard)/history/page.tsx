"use client";

import { TransactionList } from "@/components/history/TransactionList";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          View all your on-chain and off-chain transactions
        </p>
      </div>
      <TransactionList />
    </div>
  );
}

