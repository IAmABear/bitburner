const upgradeScriptPath = "/servers/upgrade-servers.js";
const buyScriptPath = "/servers/buy-server.js";

export async function main(ns: NS): Promise<void> {
  if (ns.getPurchasedServers().length === ns.getPurchasedServerLimit()) {
    if (!ns.isRunning(upgradeScriptPath, "home")) {
      ns.run(upgradeScriptPath);
    }

    if (ns.isRunning(buyScriptPath, "home")) {
      ns.scriptKill(buyScriptPath, "home");
    }
  } else if (!ns.isRunning(buyScriptPath, "home")) {
    ns.run(buyScriptPath);
  }
}
