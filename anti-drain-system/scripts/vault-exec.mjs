#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// baca artifact vault
const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/AntiDrainVault.sol/AntiDrainVault.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const VAULT       = process.env.VAULT;
const OPERATOR_PK = process.env.OPERATOR_PK;
const RPC_URL     = process.env.RPC_URL;
const CHAIN_ID    = Number(process.env.CHAIN_ID);

const TARGET      = process.env.TARGET;               // kontrak tujuan
const VALUE_WEI   = BigInt(process.env.VALUE_WEI || "0");
const DATA_HEX    = process.env.DATA_HEX || "0x";

if (!VAULT || !OPERATOR_PK || !RPC_URL || !CHAIN_ID || !TARGET) {
  console.error("Set VAULT, OPERATOR_PK, RPC_URL, CHAIN_ID, TARGET di .env");
  process.exit(1);
}

const client = createWalletClient({
  account: privateKeyToAccount(OPERATOR_PK),
  chain: { id: CHAIN_ID, name: "custom", rpcUrls: { default: { http: [RPC_URL] } } },
  transport: http(RPC_URL),
});

(async () => {
  console.log("[exec] VAULT  =", VAULT);
  console.log("[exec] TARGET =", TARGET);
  console.log("[exec] VALUE  =", VALUE_WEI.toString());
  console.log("[exec] DATA   =", DATA_HEX);

  const hash = await client.writeContract({
    address: VAULT,
    abi: artifact.abi,
    functionName: "execute",
    args: [TARGET, VALUE_WEI, DATA_HEX],
  });

  console.log("[exec] TX hash =", hash);
})();
