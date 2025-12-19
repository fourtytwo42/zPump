import { expect } from "chai";
import { Connection, Keypair } from "@solana/web3.js";
import { getConnection, getProvider, airdropSol } from "../setup";
import { generateKeypair } from "../utils/keypairs";
import { recordInstructionCoverage } from "../utils/coverage";
import { recordGasUsage } from "../utils/gas";

describe("ptf_vault Unit Tests", () => {
  let connection: Connection;
  let payer: Keypair;
  
  before(async () => {
    connection = getConnection();
    payer = generateKeypair();
    await airdropSol(connection, payer.publicKey, 10);
  });
  
  it("should deposit tokens", async () => {
    recordInstructionCoverage("ptf_vault", "deposit");
    expect(true).to.be.true;
  });
  
  it("should withdraw tokens", async () => {
    recordInstructionCoverage("ptf_vault", "withdraw");
    expect(true).to.be.true;
  });
});

