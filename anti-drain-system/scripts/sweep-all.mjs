import 'dotenv/config';
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import chains from "../config/chains.json" assert {type:"json"};

const chain = process.argv[2] || "sepolia";
const config = chains[chain];

const operator = privateKeyToAccount(process.env.OPERATOR_PK);
const client = createWalletClient({
  account: operator,
  chain: { id: config.chainId },
  transport: http(config.rpc)
});

const vault = process.env.VAULT;
const abi = JSON.parse(fs.readFileSync("./artifacts/AntiDrainVault.abi.json"));

(async () => {
  // sweep ETH
  let tx1 = await client.writeContract({
    address: vault,
    abi,
    functionName: "sweepETH",
    args: [process.env.SAFE]
  });
  console.log("Sweep ETH hash:", tx1);

  // sweep common tokens
  const tokens = JSON.parse(fs.readFileSync("./config/tokens.json"));
  for (const token of tokens) {
    try {
      let tx = await client.writeContract({
        address: vault,
        abi,
        functionName: "sweepToken",
        args: [token, process.env.SAFE]
      });
      console.log("Sweep:", token, tx);
    } catch {}
  }
})();
