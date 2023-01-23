import config from "config";

const upgradeScriptPath = "/scripts/servers/upgrade-servers.js";
const buyScriptPath = "/scripts/servers/buy-server.js";

export async function main(ns: NS): Promise<void> {
  let buyScriptsRunning = true;

  while (buyScriptsRunning) {
    if (ns.getPurchasedServers().length === ns.getPurchasedServerLimit()) {
      if (!ns.isRunning(upgradeScriptPath, "home")) {
        ns.run(upgradeScriptPath);
      }

      if (ns.isRunning(buyScriptPath, "home")) {
        ns.scriptKill(buyScriptPath, "home");
      }

      buyScriptsRunning = false;
    } else if (!ns.isRunning(buyScriptPath, "home")) {
      ns.run(buyScriptPath);
    }

    await ns.sleep(config.timeouts.medium);
  }
}
