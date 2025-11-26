#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---- load token list ----
const tokensPath = path.join(__dirname, "../config/tokens.json");
const TOKENS = JSON.parse(fs.readFileSync(tokensPath, "utf8")); // array of token addresses

// ---- ENV ----
const RPC_URL     = process.env.RPC_URL;
const CHAIN_ID    = Number(process.env.CHAIN_ID);
const VAULT       = process.env.VAULT;        // tujuan sweep
const OPERATOR    = process.env.OPERATOR;     // alamat operator (EOA)
const OPERATOR_PK = process.env.OPERATOR_PK;  // private key operator

// interval & threshold
const POLL_MS               = Number(process.env.OP_SWEEPER_POLL_MS || "15000"); // 15s
const MIN_OPERATOR_ETH_WEI  = BigInt(process.env.OP_MIN_ETH_WEI || "1000000000000000"); // 0.001 ETH disisakan buat gas
const MIN_SWEEP_ETH_WEI     = BigInt(process.env.OP_MIN_SWEEP_ETH_WEI || "0");   // minimal ETH yg mau dikirim
const MIN_TOKEN_WEI         = BigInt(process.env.OP_MIN_TOKEN_WEI || "0");       // minimal token balance utk sweep

if (!RPC_URL || !CHAIN_ID || !VAULT || !OPERATOR || !OPERATOR_PK) {
  console.error("Set RPC_URL, CHAIN_ID, VAULT, OPERATOR, OPERATOR_PK di .env");
  process.exit(1);
}

const chainConfig = {
  id: CHAIN_ID,
  name: "custom",
  rpcUrls: { default: { http: [RPC_URL] } },
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
};

const operatorAccount = privateKeyToAccount(OPERATOR_PK);

// viem clients
const walletClient = createWalletClient({
  account: operatorAccount,
  chain: chainConfig,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain: chainConfig,
  transport: http(RPC_URL),
});

// minimal ERC20 ABI
const erc20Abi = [
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

// ---- ETH sweep: operator → vault ----
async function sweepEthFromOperator() {
  const bal = await publicClient.getBalance({ address: OPERATOR });
  if (bal <= MIN_OPERATOR_ETH_WEI) return;

  const sendable = bal - MIN_OPERATOR_ETH_WEI;
  if (sendable <= MIN_SWEEP_ETH_WEI) return;

  console.log(
    `[op-sweeper] ETH balance operator = ${bal.toString()} wei → sending ${sendable.toString()} wei to VAULT...`
  );

  try {
    const hash = await walletClient.sendTransaction({
      to: VAULT,
      value: sendable,
    });
    console.log("[op-sweeper] ETH sweep tx =", hash);
  } catch (e) {
    console.error(
      "[op-sweeper] ETH sweep failed:",
      e.shortMessage || e.message || e
    );
  }
}

// ---- token sweep: operator → vault ----
async function sweepTokensFromOperator() {
  for (const token of TOKENS) {
    try {
      const bal = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [OPERATOR],
      });

      if (bal <= MIN_TOKEN_WEI) continue;

      console.log(
        `[op-sweeper] token ${token} balance operator = ${bal.toString()} → sending to VAULT...`
      );

      const hash = await walletClient.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "transfer",
        args: [VAULT, bal],
      });

      console.log("[op-sweeper] token sweep tx =", hash);
    } catch (e) {
      console.error(
        `[op-sweeper] token ${token} sweep failed:`,
        e.shortMessage || e.message || e
      );
    }
  }
}

async function tick() {
  try {
    await sweepEthFromOperator();
    await sweepTokensFromOperator();
  } catch (e) {
    console.error("[op-sweeper] tick error:", e);
  }
}

console.log("[op-sweeper] Operator → Vault auto-sweeper started.");
console.log("[op-sweeper] OPERATOR =", OPERATOR);
console.log("[op-sweeper] VAULT    =", VAULT);
console.log("[op-sweeper] tokens   =", TOKENS);

setInterval(tick, POLL_MS);
