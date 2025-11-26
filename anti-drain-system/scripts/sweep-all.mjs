import "dotenv/config";
import tokens from "../config/tokens.json" assert { type: "json" };
import artifact from "../artifacts/contracts/AntiDrainVault.sol/AntiDrainVault.json" assert { type: "json" };
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const VAULT = process.env.VAULT;
const OPERATOR_PK = process.env.OPERATOR_PK;
const SAFE = process.env.SAFE; // tujuan sweep

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID);

const client = createWalletClient({
  account: privateKeyToAccount(OPERATOR_PK),
  chain: { id: CHAIN_ID },
  transport: http(RPC_URL)
});

(async () => {
  console.log("Sweeping ETH...");
  await client.writeContract({
    address: VAULT,
    abi: artifact.abi,
    functionName: "sweepETH",
    args: [SAFE]
  });

  for (const token of tokens) {
    try {
      console.log("Sweeping:", token);
      await client.writeContract({
        address: VAULT,
        abi: artifact.abi,
        functionName: "sweepToken",
        args: [token, SAFE]
      });
    } catch {}
  }
})();
