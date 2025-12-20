// Coverage tracking utilities
import * as fs from "fs";
import * as path from "path";

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

const COVERAGE_FILE = path.join(__dirname, "..", "coverage-data.json");

function loadCoverageData(): Map<string, InstructionCoverage[]> {
  const data = new Map<string, InstructionCoverage[]>();
  try {
    if (fs.existsSync(COVERAGE_FILE)) {
      const fileData = JSON.parse(fs.readFileSync(COVERAGE_FILE, "utf-8"));
      for (const [program, instructions] of Object.entries(fileData)) {
        data.set(program, instructions as InstructionCoverage[]);
      }
    }
  } catch (e) {
    // File doesn't exist or is invalid, start fresh
  }
  return data;
}

function saveCoverageData(data: Map<string, InstructionCoverage[]>) {
  try {
    const fileData: Record<string, InstructionCoverage[]> = {};
    for (const [program, instructions] of data.entries()) {
      fileData[program] = instructions;
    }
    fs.writeFileSync(COVERAGE_FILE, JSON.stringify(fileData, null, 2));
  } catch (e) {
    // Ignore write errors
  }
}

const coverageData: Map<string, InstructionCoverage[]> = loadCoverageData();

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
  
  // Persist coverage data after each record
  saveCoverageData(coverageData);
}

// Define total instructions per program
const TOTAL_INSTRUCTIONS: Record<string, number> = {
  "ptf_pool": 11, // prepare_shield, execute_shield_v2, prepare_unshield, execute_unshield_verify, execute_unshield_update, execute_unshield_withdraw, execute_transfer, execute_transfer_from, approve_allowance, execute_batch_transfer, execute_batch_transfer_from
  "ptf_factory": 3, // initialize_factory, register_mint, create_verifying_key
  "ptf_vault": 2, // deposit, withdraw
  "ptf_verifier_groth16": 2, // initialize_verifying_key, verify_groth16
};

export function generateCoverageReport(program: string): CoverageReport {
  const instructions = coverageData.get(program) || [];
  const totalInstructions = TOTAL_INSTRUCTIONS[program] || instructions.length;
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
  // Generate reports for all known programs
  for (const program of Object.keys(TOTAL_INSTRUCTIONS)) {
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

