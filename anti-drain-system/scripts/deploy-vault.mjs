#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// baca artifact dari Hardhat (JSON)
const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/AntiDrainVault.sol/AntiDrainVault.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const RPC_URL   = process.env.RPC_URL;
const CHAIN_ID  = Number(process.env.CHAIN_ID);
const OWNER_PK  = process.env.OWNER_PK;
const OPERATOR  = process.env.OPERATOR;
const DAILY_ETH = process.env.DAILY_ETH || "0.02";
const DEPLOY_GAS = BigInt(process.env.DEPLOY_GAS || "3000000");

if (!RPC_URL || !CHAIN_ID || !OWNER_PK || !OPERATOR) {
  console.error("Isi .env dulu dengan RPC_URL, CHAIN_ID, OWNER_PK, OPERATOR");
  process.exit(1);
}

const abi      = artifact.abi;
const bytecode = artifact.bytecode;

const chainConfig = {
  id: CHAIN_ID,
  name: "custom",
  rpcUrls: { default: { http: [RPC_URL] } },
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
};

// account owner (Wallet A)
const account = privateKeyToAccount(OWNER_PK);

const walletClient = createWalletClient({
  account,
  chain: chainConfig,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain: chainConfig,
  transport: http(RPC_URL),
});

async function main() {
  console.log("[deploy] RPC_URL   =", RPC_URL);
  console.log("[deploy] CHAIN_ID  =", CHAIN_ID);
  console.log("[deploy] Owner     =", account.address);
  console.log("[deploy] Operator  =", OPERATOR);
  console.log("[deploy] DAILY_ETH =", DAILY_ETH);
  console.log("[deploy] GAS LIMIT =", DEPLOY_GAS.toString());

  const dailyLimitWei = parseEther(DAILY_ETH);

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    account,
    gas: DEPLOY_GAS,
    args: [account.address, OPERATOR, dailyLimitWei],
  });

  console.log("[deploy] TX hash   =", hash);
  console.log("[deploy] waiting for receipt...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("[deploy] Status    =", receipt.status);
  console.log("[deploy] VAULT     =", receipt.contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
