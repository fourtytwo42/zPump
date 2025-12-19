import { getAllCoverageReports, printCoverageReport } from "./utils/coverage";
import { printGasReport, verifyAllWithinGasLimit } from "./utils/gas";

async function generateCoverageReport() {
  console.log("Generating coverage report...\n");
  
  const reports = getAllCoverageReports();
  
  for (const report of reports) {
    printCoverageReport(report);
  }
  
  const overallCoverage = reports.reduce((sum, r) => sum + r.coveragePercentage, 0) / reports.length;
  console.log(`\nOverall Coverage: ${overallCoverage.toFixed(2)}%`);
  
  const targetCoverage = 99;
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

