import "dotenv/config";
import artifact from "../artifacts/contracts/AntiDrainVault.sol/AntiDrainVault.json" assert { type: "json" };
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const VAULT = process.env.VAULT;
const OPERATOR_PK = process.env.OPERATOR_PK;

const RPC_URL = process.env.RPC_URL;
const CHAIN_ID = Number(process.env.CHAIN_ID);

const TARGET = process.env.TARGET;
const VALUE_WEI = BigInt(process.env.VALUE_WEI || "0");
const DATA_HEX = process.env.DATA_HEX || "0x";

const client = createWalletClient({
  account: privateKeyToAccount(OPERATOR_PK),
  chain: { id: CHAIN_ID },
  transport: http(RPC_URL)
});

(async () => {
  const hash = await client.writeContract({
    address: VAULT,
    abi: artifact.abi,
    functionName: "execute",
    args: [TARGET, VALUE_WEI, DATA_HEX]
  });

  console.log("Executed TX:", hash);
})();
