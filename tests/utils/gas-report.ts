// Enhanced gas reporting utilities
// Generates detailed gas usage reports and tracks trends

import { Connection } from "@solana/web3.js";

interface GasUsageEntry {
  operation: string;
  program: string;
  instruction: string;
  computeUnits: number;
  timestamp: number;
}

interface GasReport {
  operation: string;
  min: number;
  max: number;
  avg: number;
  count: number;
  recent: GasUsageEntry[];
}

// In-memory storage for gas usage (in production, would use database)
const gasUsageHistory: GasUsageEntry[] = [];
const MAX_HISTORY = 1000;

/**
 * Add gas usage entry to history
 */
export function recordGasUsageEntry(
  operation: string,
  program: string,
  instruction: string,
  computeUnits: number
): void {
  const entry: GasUsageEntry = {
    operation,
    program,
    instruction,
    computeUnits,
    timestamp: Date.now(),
  };
  
  gasUsageHistory.push(entry);
  
  // Keep only recent history
  if (gasUsageHistory.length > MAX_HISTORY) {
    gasUsageHistory.shift();
  }
}

/**
 * Generate gas usage report for an operation
 */
export function generateGasReport(operation: string): GasReport | null {
  const entries = gasUsageHistory.filter(e => e.operation === operation);
  
  if (entries.length === 0) {
    return null;
  }
  
  const computeUnits = entries.map(e => e.computeUnits);
  const min = Math.min(...computeUnits);
  const max = Math.max(...computeUnits);
  const avg = computeUnits.reduce((a, b) => a + b, 0) / computeUnits.length;
  
  return {
    operation,
    min,
    max,
    avg: Math.round(avg),
    count: entries.length,
    recent: entries.slice(-10), // Last 10 entries
  };
}

/**
 * Generate comprehensive gas report
 */
export function generateComprehensiveReport(): {
  operations: GasReport[];
  warnings: string[];
  totalOperations: number;
} {
  const operations = new Set(gasUsageHistory.map(e => e.operation));
  const reports: GasReport[] = [];
  const warnings: string[] = [];
  
  for (const operation of operations) {
    const report = generateGasReport(operation);
    if (report) {
      reports.push(report);
      
      // Check for warnings
      if (report.max > 1_400_000) {
        warnings.push(`${operation}: Maximum gas (${report.max}) exceeds 1.4M CU limit!`);
      }
      if (report.avg > 1_200_000) {
        warnings.push(`${operation}: Average gas (${report.avg}) approaching 1.4M CU limit`);
      }
    }
  }
  
  return {
    operations: reports.sort((a, b) => b.avg - a.avg),
    warnings,
    totalOperations: gasUsageHistory.length,
  };
}

/**
 * Print gas usage report to console
 */
export function printGasReport(): void {
  const report = generateComprehensiveReport();
  
  console.log("\n=== Gas Usage Report ===");
  console.log(`Total operations recorded: ${report.totalOperations}`);
  console.log("");
  
  if (report.operations.length === 0) {
    console.log("No gas usage data available");
    return;
  }
  
  console.log("Operation Gas Usage:");
  console.log("─".repeat(80));
  for (const op of report.operations) {
    console.log(`${op.operation.padEnd(30)} Min: ${op.min.toLocaleString().padStart(10)} Max: ${op.max.toLocaleString().padStart(10)} Avg: ${op.avg.toLocaleString().padStart(10)} (${op.count} samples)`);
    
    if (op.max > 1_400_000) {
      console.log(`  ⚠️  WARNING: Exceeds 1.4M CU limit!`);
    } else if (op.avg > 1_200_000) {
      console.log(`  ⚠️  WARNING: Average approaching limit`);
    }
  }
  
  if (report.warnings.length > 0) {
    console.log("");
    console.log("⚠️  Warnings:");
    for (const warning of report.warnings) {
      console.log(`  - ${warning}`);
    }
  }
  
  console.log("─".repeat(80));
  console.log("");
}

/**
 * Check if operation is within gas limit
 */
export function isWithinGasLimit(computeUnits: number, limit: number = 1_400_000): boolean {
  return computeUnits <= limit;
}

/**
 * Get gas usage percentage of limit
 */
export function getGasUsagePercentage(computeUnits: number, limit: number = 1_400_000): number {
  return Math.round((computeUnits / limit) * 100);
}

