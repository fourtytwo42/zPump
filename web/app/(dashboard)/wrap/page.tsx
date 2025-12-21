"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldForm } from "@/components/wrap/ShieldForm";
import { UnshieldForm } from "@/components/wrap/UnshieldForm";

export default function WrapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Wrap Tokens</h1>
        <p className="text-muted-foreground">
          Shield tokens into privacy-preserving zTokens or unshield them back
        </p>
      </div>

      <Tabs defaultValue="shield" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shield">Shield</TabsTrigger>
          <TabsTrigger value="unshield">Unshield</TabsTrigger>
        </TabsList>
        <TabsContent value="shield">
          <ShieldForm />
        </TabsContent>
        <TabsContent value="unshield">
          <UnshieldForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

