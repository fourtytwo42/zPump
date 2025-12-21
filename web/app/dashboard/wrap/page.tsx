"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldForm } from "@/components/wrap/ShieldForm";
import { UnshieldForm } from "@/components/wrap/UnshieldForm";
import { Shield, ArrowLeftRight } from "lucide-react";

export default function WrapPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
            <ArrowLeftRight className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text-primary">Wrap Tokens</h1>
            <p className="text-muted-foreground text-lg">
              Shield tokens into privacy-preserving zTokens or unshield them back
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="shield" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger 
            value="shield" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg transition-all"
          >
            <Shield className="h-4 w-4 mr-2" />
            Shield
          </TabsTrigger>
          <TabsTrigger 
            value="unshield"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg transition-all"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Unshield
          </TabsTrigger>
        </TabsList>
        <TabsContent value="shield" className="mt-6">
          <ShieldForm />
        </TabsContent>
        <TabsContent value="unshield" className="mt-6">
          <UnshieldForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

