#!/usr/bin/env node
import 'dotenv/config';
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import chains from "../config/chains.json" assert {type:"json"};

const chain = process.argv[2] || "sepolia";
const config = chains[chain];
if (!config) throw new Error("Chain not found");

const abi = JSON.parse(fs.readFileSync("./artifacts/AntiDrainVault.abi.json"));
const bytecode = fs.readFileSync("./artifacts/AntiDrainVault.bin", "utf8");

const account = privateKeyToAccount(process.env.OWNER_PK);

const client = createWalletClient({
  account,
  chain: {
    id: config.chainId,
    name: chain,
    rpcUrls: { default: { http: [config.rpc] } }
  },
  transport: http(config.rpc),
});

(async () => {
  const hash = await client.deployContract({
    abi,
    bytecode,
    args: [
      account.address,
      process.env.OPERATOR || "",
      parseEther("0.02")
    ]
  });

  console.log("TX:", hash);
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log("Deployed at:", receipt.contractAddress);
})();
