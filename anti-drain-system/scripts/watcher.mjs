import 'dotenv/config';
import { ethers } from "ethers";
import axios from "axios";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_CHAT_ID;

function alert(msg) {
  return axios.get(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=${msg}`);
}

const provider = new ethers.JsonRpcProvider(process.env.WATCHER_RPC);
const vault = process.env.VAULT;

// Event: Executed
const iface = new ethers.Interface([
  "event Executed(address operator,address target,uint256 value,bytes data)"
]);

provider.on(vault, (log) => {
  try {
    const parsed = iface.parseLog(log);
    alert(`VAULT EXECUTED:\nOperator:${parsed.args.operator}\nTarget:${parsed.args.target}\nValue:${parsed.args.value}`);
  } catch {}
});
