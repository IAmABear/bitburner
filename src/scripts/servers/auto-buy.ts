import { medium } from "/scripts/utils/timeoutTimes";

const upgradeScriptPath = "/scripts/servers/upgrade-servers.js";
const buyScriptPath = "/scripts/servers/buy-server.js";

export async function main(ns: NS): Promise<void> {
  let buyScriptsRunning = true;

  while (buyScriptsRunning) {
    if (ns.getPurchasedServers().length === ns.getPurchasedServerLimit()) {
      ns.run(upgradeScriptPath);

      if (ns.isRunning(buyScriptPath, "home")) {
        ns.scriptKill(buyScriptPath, "home");
      }

      buyScriptsRunning = false;
    } else if (!ns.isRunning(buyScriptPath, "home")) {
      ns.run(buyScriptPath);
    }

    await ns.sleep(medium);
  }
}
