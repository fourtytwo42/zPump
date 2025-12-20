import { getAllCoverageReports, printCoverageReport } from "./utils/coverage";
import { printGasReport, verifyAllWithinGasLimit } from "./utils/gas";

async function generateCoverageReport() {
  console.log("Generating coverage report...\n");
  
  const reports = getAllCoverageReports();
  
  for (const report of reports) {
    printCoverageReport(report);
  }
  
  // Calculate overall coverage weighted by total instructions
  const totalInstructions = reports.reduce((sum, r) => sum + r.totalInstructions, 0);
  const totalCovered = reports.reduce((sum, r) => sum + r.coveredInstructions, 0);
  const overallCoverage = totalInstructions > 0
    ? (totalCovered / totalInstructions) * 100
    : 0;
  
  console.log(`\nOverall Coverage: ${overallCoverage.toFixed(2)}%`);
  console.log(`  Total Instructions: ${totalInstructions}`);
  console.log(`  Covered Instructions: ${totalCovered}`);
  
  const targetCoverage = 90;
  if (overallCoverage >= targetCoverage) {
    console.log(`✓ Coverage target met (${targetCoverage}%)`);
  } else {
    console.log(`✗ Coverage target not met (${targetCoverage}% required, got ${overallCoverage.toFixed(2)}%)`);
    process.exit(1);
  }
  
  printGasReport();
  
  if (!verifyAllWithinGasLimit()) {
    console.log("\n✗ Some operations exceeded gas limits");
    process.exit(1);
  } else {
    console.log("\n✓ All operations within gas limits");
  }
  
  console.log("\nAll checks passed!");
}

if (require.main === module) {
  generateCoverageReport()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

