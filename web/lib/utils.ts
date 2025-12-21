import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: number | undefined | null, decimals: number = 9): string {
  if (amount === undefined || amount === null) return "0.00";
  
  // If amount is already in the display unit (e.g., SOL), don't divide by decimals
  // Check if amount is less than 1 and has many decimal places - likely already converted
  // For SOL specifically, if amount < 1000 and has decimals, assume it's already in SOL units
  if (decimals === 9 && amount < 1000 && amount > 0 && amount < 1) {
    // This is likely already in SOL units, just format it
    return amount.toFixed(9).replace(/\.?0+$/, '');
  }
  
  // Otherwise, treat as raw amount in smallest unit
  const divisor = Math.pow(10, decimals);
  const formatted = (amount / divisor).toFixed(decimals);
  // Remove trailing zeros
  return parseFloat(formatted).toString();
}

// Format SOL balance (already in SOL units, not lamports)
export function formatSolBalance(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "0.00";
  // Amount is already in SOL, just format with appropriate decimals
  if (amount >= 1) {
    return amount.toFixed(2).replace(/\.?0+$/, '');
  } else if (amount >= 0.01) {
    return amount.toFixed(4).replace(/\.?0+$/, '');
  } else {
    return amount.toFixed(9).replace(/\.?0+$/, '');
  }
}

