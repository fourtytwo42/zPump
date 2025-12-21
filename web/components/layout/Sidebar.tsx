"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Send,
  History,
  Coins,
  Droplets,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/wrap", label: "Wrap", icon: ArrowLeftRight },
  { href: "/dashboard/send", label: "Send", icon: Send },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/mint", label: "Mint", icon: Coins },
  { href: "/dashboard/faucet", label: "Faucet", icon: Droplets },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r min-h-screen p-4">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-secondary"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

