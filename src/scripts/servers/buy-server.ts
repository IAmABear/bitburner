import {
  growScriptPath,
  hackScriptPath,
  preparingToUpgradeScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import { long, skip } from "/scripts/utils/timeoutTimes";

let dynamicSleep = long;
export async function main(ns: NS): Promise<void> {
  const ram = Number(ns.args[0]) || 8;
  const i = await ns.getPurchasedServers().length;

  while ((await ns.getPurchasedServerLimit()) >= i) {
    if (ns.getPurchasedServerCost(ram) < ns.getServerMoneyAvailable("home")) {
      dynamicSleep = skip;
      const targetServer = await ns.purchaseServer("ghost-" + ram, ram);

      if (targetServer) {
        await ns.scp(
          [
            hackScriptPath,
            growScriptPath,
            weakenScriptPath,
            preparingToUpgradeScriptPath,
          ],
          targetServer
        );
      }
    } else {
      dynamicSleep = long;
    }

    await ns.sleep(dynamicSleep);
  }
}
