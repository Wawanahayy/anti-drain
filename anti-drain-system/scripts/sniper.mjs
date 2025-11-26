import 'dotenv/config';
import { createPublicClient, http } from "viem";
import { ethers } from "ethers";

const rpc = process.env.SNIPE_RPC;
const OG = process.env.OG_WALLET;
const VAULT = process.env.VAULT;
const PRIVATE = process.env.OPERATOR_PK;

const provider = new ethers.JsonRpcProvider(rpc);
const signer = new ethers.Wallet(PRIVATE, provider);

console.log("Sniper READY scanning", OG);

provider.on("pending", async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx || !tx.to) return;

    if (tx.to.toLowerCase() === OG.toLowerCase()) {
      console.log("DETECTED TOKEN/ETH INCOMING:", txHash);

      // segera sweep
      await signer.sendTransaction({
        to: VAULT,
        value: await provider.getBalance(OG)
      });

      console.log("Sniped & swept!");
    }
  } catch {}
});
