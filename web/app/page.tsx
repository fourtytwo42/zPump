"use client";

import { useRouter } from "next/navigation";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Lock } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse float"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse float" style={{ animationDelay: "2s" }}></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-cyan-600 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse float" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="text-3xl font-bold gradient-text">zPump</div>
        <WalletButton />
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4">
            <span className="gradient-text">Privacy</span>{" "}
            <span className="text-white">Pool</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Zero-knowledge privacy for Solana. Shield, transfer, and unshield tokens
            with complete anonymity using advanced cryptographic proofs.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Button
              size="lg"
              className="bg-white text-blue-700 hover:bg-white/90 text-lg px-8 py-6 font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={() => router.push("/dashboard")}
            >
              Launch App
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/40 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 hover:border-white/60 text-lg px-8 py-6 font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={() => router.push("/dashboard/wrap")}
            >
              Get Started
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            <div className="glass-dark rounded-2xl p-6 backdrop-blur-md hover:scale-105 transition-transform border border-white/10">
              <Shield className="h-12 w-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Zero-Knowledge Proofs</h3>
              <p className="text-white/70">
                Advanced cryptographic proofs ensure complete privacy for all transactions
              </p>
            </div>
            <div className="glass-dark rounded-2xl p-6 backdrop-blur-md hover:scale-105 transition-transform border border-white/10">
              <Zap className="h-12 w-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
              <p className="text-white/70">
                Built on Solana for instant transactions with minimal fees
              </p>
            </div>
            <div className="glass-dark rounded-2xl p-6 backdrop-blur-md hover:scale-105 transition-transform border border-white/10">
              <Lock className="h-12 w-12 text-indigo-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Secure by Design</h3>
              <p className="text-white/70">
                Your privacy is protected by cutting-edge cryptography
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

