// Print gas report from test runs
import { getAllGasReports, printGasReport, verifyAllWithinGasLimit, MAX_COMPUTE_UNITS } from "../tests/utils/gas";

console.log("=== Gas Usage Report ===");
console.log(`Max Compute Units: ${MAX_COMPUTE_UNITS.toLocaleString()}`);
console.log("");

const reports = getAllGasReports();

if (reports.length === 0) {
  console.log("No gas measurements recorded yet.");
  console.log("Run tests with gas measurement enabled.");
} else {
  printGasReport();
  console.log("");
  const allWithinLimit = verifyAllWithinGasLimit();
  console.log(`All operations within limit: ${allWithinLimit ? "✓" : "✗"}`);
  
  if (!allWithinLimit) {
    console.log("");
    console.log("⚠️  WARNING: Some operations exceed the gas limit!");
    process.exit(1);
  }
}

