#!/usr/bin/env node
import "dotenv/config";
import fs from "fs";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Sederhanakan dulu: kita pilih chain via ENV saja
const RPC_URL = process.env.RPC_URL;       // mis: https://sepolia.infura.io/v3/...
const CHAIN_ID = Number(process.env.CHAIN_ID || "11155111"); // sepolia default

if (!RPC_URL) {
  console.error("Set RPC_URL di .env");
  process.exit(1);
}

const OWNER_PK = process.env.OWNER_PK;
const OPERATOR = process.env.OPERATOR;
if (!OWNER_PK || !OPERATOR) {
  console.error("Set OWNER_PK dan OPERATOR di .env");
  process.exit(1);
}

// === baca artifact Hardhat ===
const artifact = JSON.parse(
  fs.readFileSync(
    "./artifacts/contracts/AntiDrainVault.sol/AntiDrainVault.json",
    "utf8"
  )
);

const abi = artifact.abi;
const bytecode = artifact.bytecode;

const account = privateKeyToAccount(OWNER_PK);

const client = createWalletClient({
  account,
  chain: {
    id: CHAIN_ID,
    name: "custom",
    rpcUrls: { default: { http: [RPC_URL] } },
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  },
  transport: http(RPC_URL),
});

async function main() {
  console.log("[deploy] owner   =", account.address);
  console.log("[deploy] operator=", OPERATOR);

  const dailyLimit = parseEther(process.env.DAILY_ETH || "0.02");

  const hash = await client.deployContract({
    abi,
    bytecode,
    args: [account.address, OPERATOR, dailyLimit],
  });

  console.log("[deploy] tx hash =", hash);

  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log("[deploy] status  =", receipt.status);
  console.log("[deploy] vault   =", receipt.contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
