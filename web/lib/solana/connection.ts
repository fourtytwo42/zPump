import { Connection, clusterApiUrl } from "@solana/web3.js";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_NETWORK === "localnet"
    ? "http://127.0.0.1:8899"
    : clusterApiUrl("devnet");

export const connection = new Connection(RPC_URL, "confirmed");

export const getConnection = () => connection;

