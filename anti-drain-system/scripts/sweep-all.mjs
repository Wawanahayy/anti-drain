#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// artifact vault
const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/AntiDrainVault.sol/AntiDrainVault.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

// token list
const tokensPath = path.join(__dirname, "../config/tokens.json");
const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf8"));

const VAULT       = process.env.VAULT;
const OPERATOR_PK = process.env.OPERATOR_PK;
const SAFE        = process.env.SAFE;
const RPC_URL     = process.env.RPC_URL;
const CHAIN_ID    = Number(process.env.CHAIN_ID);

if (!VAULT || !OPERATOR_PK || !SAFE || !RPC_URL || !CHAIN_ID) {
  console.error("Set VAULT, OPERATOR_PK, SAFE, RPC_URL, CHAIN_ID di .env");
  process.exit(1);
}

const client = createWalletClient({
  account: privateKeyToAccount(OPERATOR_PK),
  chain: { id: CHAIN_ID, name: "custom", rpcUrls: { default: { http: [RPC_URL] } } },
  transport: http(RPC_URL),
});

(async () => {
  console.log("[sweep] VAULT =", VAULT);
  console.log("[sweep] SAFE  =", SAFE);

  // Sweep ETH
  try {
    const tx = await client.writeContract({
      address: VAULT,
      abi: artifact.abi,
      functionName: "sweepETH",
      args: [SAFE],
    });
    console.log("[sweep] ETH tx =", tx);
  } catch (e) {
    console.warn("[sweep] ETH sweep failed:", e.message || e);
  }

  // Sweep tokens
  for (const token of tokens) {
    try {
      const tx = await client.writeContract({
        address: VAULT,
        abi: artifact.abi,
        functionName: "sweepToken",
        args: [token, SAFE],
      });
      console.log("[sweep] token", token, "tx =", tx);
    } catch (e) {
      console.warn("[sweep] token", token, "failed:", e.message || e);
    }
  }
})();
