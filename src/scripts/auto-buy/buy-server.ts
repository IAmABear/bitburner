import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import { medium } from "/scripts/utils/timeoutTimes";

export async function main(ns: NS): Promise<void> {
  const ram = Number(ns.args[0]) || 8;
  const i = await ns.getPurchasedServers().length;

  while ((await ns.getPurchasedServerLimit()) >= i) {
    if (ns.getPurchasedServerCost(ram) < ns.getServerMoneyAvailable("home")) {
      const targetServer = await ns.purchaseServer("ghost-" + ram, ram);
      ns.print(`${targetServer} bought`);
      await ns.scp(
        [hackScriptPath, growScriptPath, weakenScriptPath],
        targetServer
      );
    }

    await ns.sleep(medium);
  }
}
