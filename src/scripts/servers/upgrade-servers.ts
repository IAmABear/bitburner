import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import { long, short } from "/scripts/utils/timeoutTimes";

let dynamicSleep = long;
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  while (true) {
    const servers = await ns.getPurchasedServers();

    for (const serverIndex in servers) {
      const targetServer = servers[serverIndex];
      if (!(await ns.serverExists(targetServer))) {
        continue;
      }
      const targetServerCurrentRam = await ns.getServerMaxRam(targetServer);
      const maxPossibleRamServer = await ns.getPurchasedServerMaxRam();
      const newTargetRam = targetServerCurrentRam * 2;

      if (
        newTargetRam < maxPossibleRamServer &&
        ns.getPurchasedServerCost(newTargetRam) <
          ns.getServerMoneyAvailable("home") &&
        newTargetRam <= 78000
      ) {
        dynamicSleep = short;

        await ns.killall(targetServer);
        await ns.deleteServer(targetServer);

        const newServerName = await ns.purchaseServer(
          "ghost-" + newTargetRam,
          Number(newTargetRam)
        );

        if (!(await ns.serverExists(newServerName))) {
          continue;
        }

        await ns.scp(
          [hackScriptPath, growScriptPath, weakenScriptPath],
          newServerName
        );
      } else {
        dynamicSleep = long;
      }
    }

    await ns.sleep(dynamicSleep);
  }
}
