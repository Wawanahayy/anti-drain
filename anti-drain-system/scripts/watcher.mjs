import "dotenv/config";
import { ethers } from "ethers";
import axios from "axios";

const RPC_URL = process.env.WATCHER_RPC;
const VAULT = process.env.VAULT;
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const provider = new ethers.JsonRpcProvider(RPC_URL);

const iface = new ethers.Interface([
  "event Executed(address operator,address target,uint256 value,bytes data)"
]);

function alert(msg) {
  return axios.get(
    `https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(
      msg
    )}`
  );
}

console.log("Watcher aktif...");

provider.on(VAULT, (log) => {
  try {
    const parsed = iface.parseLog(log);
    alert(
      `VAULT EXECUTED\nOperator: ${parsed.args.operator}\nTarget: ${parsed.args.target}\nValue: ${parsed.args.value}`
    );
  } catch {}
});
