import { Connection, TransactionSignature } from "@solana/web3.js";

export const MAX_COMPUTE_UNITS = 1_400_000; // 1.4M compute units

export interface GasReport {
  operation: string;
  computeUnits: number;
  withinLimit: boolean;
  signature: TransactionSignature;
}

const gasReports: GasReport[] = [];

export async function recordGasUsage(
  connection: Connection,
  operation: string,
  signature: TransactionSignature,
): Promise<GasReport> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  
  const computeUnits = tx?.meta?.computeUnitsConsumed || 0;
  const withinLimit = computeUnits <= MAX_COMPUTE_UNITS;
  
  const report: GasReport = {
    operation,
    computeUnits,
    withinLimit,
    signature,
  };
  
  gasReports.push(report);
  
  if (!withinLimit) {
    console.warn(
      `WARNING: ${operation} exceeded compute limit: ${computeUnits} > ${MAX_COMPUTE_UNITS}`,
    );
  }
  
  return report;
}

export function getAllGasReports(): GasReport[] {
  return gasReports;
}

export function printGasReport(): void {
  console.log("\nGas Usage Report:");
  console.log(`  Max Compute Units: ${MAX_COMPUTE_UNITS.toLocaleString()}`);
  console.log("\n  Operations:");
  
  for (const report of gasReports) {
    const status = report.withinLimit ? "✓" : "✗";
    console.log(
      `    ${status} ${report.operation}: ${report.computeUnits.toLocaleString()} CU`,
    );
  }
  
  const allWithinLimit = gasReports.every((r) => r.withinLimit);
  console.log(`\n  All operations within limit: ${allWithinLimit ? "✓" : "✗"}`);
}

export function verifyAllWithinGasLimit(): boolean {
  return gasReports.every((r) => r.withinLimit);
}

