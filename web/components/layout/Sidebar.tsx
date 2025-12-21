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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-400" },
  { href: "/dashboard/wrap", label: "Wrap", icon: ArrowLeftRight, color: "text-indigo-400" },
  { href: "/dashboard/send", label: "Send", icon: Send, color: "text-cyan-400" },
  { href: "/dashboard/history", label: "History", icon: History, color: "text-emerald-400" },
  { href: "/dashboard/mint", label: "Mint", icon: Coins, color: "text-amber-400" },
  { href: "/dashboard/faucet", label: "Faucet", icon: Droplets, color: "text-sky-400" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-gradient-to-b from-background to-muted/20 min-h-screen p-6">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start group transition-all duration-200",
                  isActive && "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-l-2 border-blue-500 shadow-md",
                  !isActive && "hover:bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "mr-3 h-5 w-5 transition-all",
                  isActive ? item.color : "text-muted-foreground group-hover:" + item.color
                )} />
                <span className={cn(
                  "font-medium",
                  isActive && "text-foreground"
                )}>
                  {item.label}
                </span>
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

