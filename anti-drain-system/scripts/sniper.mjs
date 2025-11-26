import "dotenv/config";
import { ethers } from "ethers";

const OG = process.env.OG_WALLET;
const VAULT = process.env.VAULT;
const OPERATOR_PK = process.env.OPERATOR_PK;
const RPC_URL = process.env.SNIPE_RPC;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const operator = new ethers.Wallet(OPERATOR_PK, provider);

console.log("Sniper running for:", OG);

provider.on("pending", async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx || tx.to !== OG) return;

    console.log("Detected incoming airdrop!", txHash);

    const bal = await provider.getBalance(OG);

    await operator.sendTransaction({
      to: VAULT,
      value: bal
    });

    console.log("Sniped and swept to vault.");
  } catch {}
});
