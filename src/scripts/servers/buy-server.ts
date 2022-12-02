import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import { long, short } from "/scripts/utils/timeoutTimes";

let dynamicSleep = long;
export async function main(ns: NS): Promise<void> {
  const ram = Number(ns.args[0]) || 8;
  const i = await ns.getPurchasedServers().length;

  while ((await ns.getPurchasedServerLimit()) >= i) {
    if (ns.getPurchasedServerCost(ram) < ns.getServerMoneyAvailable("home")) {
      dynamicSleep = short;
      const targetServer = await ns.purchaseServer("ghost-" + ram, ram);

      if (targetServer) {
        await ns.scp(
          [hackScriptPath, growScriptPath, weakenScriptPath],
          targetServer
        );
      }
    } else {
      dynamicSleep = long;
    }

    await ns.sleep(dynamicSleep);
  }
}
