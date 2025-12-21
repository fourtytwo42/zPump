"use client";

import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Shield } from "lucide-react";

export function Header() {

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="relative">
            <Shield className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-md group-hover:blur-lg transition-all"></div>
          </div>
          <span className="text-2xl font-bold gradient-text-primary">zPump</span>
        </Link>
        <WalletButton />
      </div>
    </header>
  );
}

