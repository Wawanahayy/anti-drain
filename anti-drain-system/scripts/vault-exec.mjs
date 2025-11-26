import 'dotenv/config';
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import chains from "../config/chains.json" assert {type:"json"};

const chain = process.argv[2] || "sepolia";
const config = chains[chain];

const client = createWalletClient({
  account: privateKeyToAccount(process.env.OPERATOR_PK),
  chain: { id: config.chainId },
  transport: http(config.rpc)
});

const abi = JSON.parse(fs.readFileSync("./artifacts/AntiDrainVault.abi.json"));

(async () => {
  const hash = await client.writeContract({
    address: process.env.VAULT,
    abi,
    functionName: "execute",
    args: [
      process.env.TARGET,
      BigInt(process.env.VALUE_WEI || "0"),
      process.env.DATA_HEX
    ]
  });

  console.log("Executed TX:", hash);
})();
