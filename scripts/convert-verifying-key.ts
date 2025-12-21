// Script to convert snarkjs verification_key.json to Solana binary format
// Usage: ts-node scripts/convert-verifying-key.ts <verification_key.json> <output.bin>

import * as fs from "fs";
import * as path from "path";

interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[][][];
  IC: string[][];
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function g1PointToBytes(point: string[]): Uint8Array {
  // Convert G1 point from [x, y] format to 64-byte compressed format
  // This is a placeholder - actual conversion depends on point compression format
  const x = hexToBytes(point[0].replace("0x", ""));
  const y = hexToBytes(point[1].replace("0x", ""));
  
  // Compressed format: [x (32 bytes), y (32 bytes)]
  const result = new Uint8Array(64);
  result.set(x.slice(0, 32), 0);
  result.set(y.slice(0, 32), 32);
  return result;
}

function g2PointToBytes(point: string[][]): Uint8Array {
  // Convert G2 point from [[x0, x1], [y0, y1]] format to 128-byte compressed format
  // This is a placeholder - actual conversion depends on point compression format
  const x0 = hexToBytes(point[0][0].replace("0x", ""));
  const x1 = hexToBytes(point[0][1].replace("0x", ""));
  const y0 = hexToBytes(point[1][0].replace("0x", ""));
  const y1 = hexToBytes(point[1][1].replace("0x", ""));
  
  // Compressed format: [x0 (32), x1 (32), y0 (32), y1 (32)]
  const result = new Uint8Array(128);
  result.set(x0.slice(0, 32), 0);
  result.set(x1.slice(0, 32), 32);
  result.set(y0.slice(0, 32), 64);
  result.set(y1.slice(0, 32), 96);
  return result;
}

function convertVerifyingKey(inputPath: string, outputPath: string): void {
  console.log(`Reading verification key from: ${inputPath}`);
  const vkJson: VerificationKey = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  
  console.log(`Converting verification key...`);
  console.log(`- Protocol: ${vkJson.protocol}`);
  console.log(`- Curve: ${vkJson.curve}`);
  console.log(`- Public inputs: ${vkJson.nPublic}`);
  
  // Convert to binary format:
  // [alpha (64)][beta (128)][gamma (128)][delta (128)][gamma_abc_count (4)][gamma_abc... (64 each)]
  
  const buffer: number[] = [];
  
  // Alpha (G1 point, 64 bytes)
  const alpha = g1PointToBytes(vkJson.vk_alpha_1);
  buffer.push(...Array.from(alpha));
  
  // Beta (G2 point, 128 bytes)
  const beta = g2PointToBytes(vkJson.vk_beta_2);
  buffer.push(...Array.from(beta));
  
  // Gamma (G2 point, 128 bytes)
  const gamma = g2PointToBytes(vkJson.vk_gamma_2);
  buffer.push(...Array.from(gamma));
  
  // Delta (G2 point, 128 bytes)
  const delta = g2PointToBytes(vkJson.vk_delta_2);
  buffer.push(...Array.from(delta));
  
  // Gamma_abc count (4 bytes, little-endian)
  const gammaAbcCount = vkJson.IC.length;
  const countBytes = new Uint8Array(4);
  const countView = new DataView(countBytes.buffer);
  countView.setUint32(0, gammaAbcCount, true);
  buffer.push(...Array.from(countBytes));
  
  // Gamma_abc points (G1 points, 64 bytes each)
  for (const ic of vkJson.IC) {
    const icPoint = g1PointToBytes(ic);
    buffer.push(...Array.from(icPoint));
  }
  
  // Write to file
  const outputBuffer = Buffer.from(buffer);
  fs.writeFileSync(outputPath, outputBuffer);
  
  console.log(`\nVerification key converted successfully!`);
  console.log(`- Output file: ${outputPath}`);
  console.log(`- Total size: ${outputBuffer.length} bytes`);
  console.log(`- Alpha: 64 bytes`);
  console.log(`- Beta: 128 bytes`);
  console.log(`- Gamma: 128 bytes`);
  console.log(`- Delta: 128 bytes`);
  console.log(`- Gamma_abc count: ${gammaAbcCount} (4 bytes)`);
  console.log(`- Gamma_abc points: ${gammaAbcCount} × 64 = ${gammaAbcCount * 64} bytes`);
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: ts-node scripts/convert-verifying-key.ts <verification_key.json> <output.bin>");
  process.exit(1);
}

const [inputPath, outputPath] = args;
convertVerifyingKey(inputPath, outputPath);

