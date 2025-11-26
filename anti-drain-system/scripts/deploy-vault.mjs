#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// baca artifact dari Hardhat (JSON biasa)
const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/AntiDrainVault.sol/AntiDrainVault.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const RPC_URL  = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID);
const OWNER_PK = process.env.OWNER_PK;
const OPERATOR = process.env.OPERATOR;
const DAILY_ETH = process.env.DAILY_ETH || "0.02";

if (!RPC_URL || !CHAIN_ID || !OWNER_PK || !OPERATOR) {
  console.error("Isi .env dulu dengan RPC_URL, CHAIN_ID, OWNER_PK, OPERATOR");
  process.exit(1);
}

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
  console.log("[deploy] RPC_URL  =", RPC_URL);
  console.log("[deploy] CHAIN_ID =", CHAIN_ID);
  console.log("[deploy] Owner    =", account.address);
  console.log("[deploy] Operator =", OPERATOR);
  console.log("[deploy] DAILY_ETH=", DAILY_ETH);

  const dailyLimitWei = parseEther(DAILY_ETH);

  const hash = await client.deployContract({
    abi,
    bytecode,
    args: [account.address, OPERATOR, dailyLimitWei],
  });

  console.log("[deploy] TX hash  =", hash);

  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log("[deploy] Status   =", receipt.status);
  console.log("[deploy] VAULT    =", receipt.contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
