"use client";

import Link from "next/link";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold">
            zPump
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/dashboard/wrap">
              <Button variant="ghost">Wrap</Button>
            </Link>
            <Link href="/dashboard/send">
              <Button variant="ghost">Send</Button>
            </Link>
            <Link href="/dashboard/history">
              <Button variant="ghost">History</Button>
            </Link>
            <Link href="/dashboard/mint">
              <Button variant="ghost">Mint</Button>
            </Link>
            <Link href="/dashboard/faucet">
              <Button variant="ghost">Faucet</Button>
            </Link>
          </nav>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}

