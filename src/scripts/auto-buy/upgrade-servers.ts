import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import { long } from "/scripts/utils/timeoutTimes";

export async function main(ns: NS): Promise<void> {
  const servers = await ns.getPurchasedServers();

  while (servers.length > 0) {
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
          ns.getServerMoneyAvailable("home")
      ) {
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
      }

      await ns.sleep(long);
    }
  }
}
