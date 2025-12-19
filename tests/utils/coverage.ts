// Coverage tracking utilities

export interface CoverageReport {
  program: string;
  instructions: InstructionCoverage[];
  totalInstructions: number;
  coveredInstructions: number;
  coveragePercentage: number;
}

export interface InstructionCoverage {
  name: string;
  covered: boolean;
  testCount: number;
}

const coverageData: Map<string, InstructionCoverage[]> = new Map();

export function recordInstructionCoverage(
  program: string,
  instruction: string,
): void {
  if (!coverageData.has(program)) {
    coverageData.set(program, []);
  }
  
  const instructions = coverageData.get(program)!;
  const existing = instructions.find((i) => i.name === instruction);
  
  if (existing) {
    existing.covered = true;
    existing.testCount += 1;
  } else {
    instructions.push({
      name: instruction,
      covered: true,
      testCount: 1,
    });
  }
}

export function generateCoverageReport(program: string): CoverageReport {
  const instructions = coverageData.get(program) || [];
  const totalInstructions = instructions.length;
  const coveredInstructions = instructions.filter((i) => i.covered).length;
  const coveragePercentage = totalInstructions > 0
    ? (coveredInstructions / totalInstructions) * 100
    : 0;
  
  return {
    program,
    instructions,
    totalInstructions,
    coveredInstructions,
    coveragePercentage,
  }
}

export function getAllCoverageReports(): CoverageReport[] {
  const reports: CoverageReport[] = [];
  for (const program of coverageData.keys()) {
    reports.push(generateCoverageReport(program));
  }
  return reports;
}

export function printCoverageReport(report: CoverageReport): void {
  console.log(`\nCoverage Report for ${report.program}:`);
  console.log(`  Total Instructions: ${report.totalInstructions}`);
  console.log(`  Covered Instructions: ${report.coveredInstructions}`);
  console.log(`  Coverage: ${report.coveragePercentage.toFixed(2)}%`);
  console.log("\n  Instructions:");
  for (const instruction of report.instructions) {
    const status = instruction.covered ? "✓" : "✗";
    console.log(`    ${status} ${instruction.name} (${instruction.testCount} tests)`);
  }
}

