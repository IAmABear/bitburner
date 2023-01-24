const upgradeScriptPath = "/servers/upgrade-servers.js";
const buyScriptPath = "/servers/buy-server.js";

export async function main(ns: NS): Promise<void> {
  const servers: string[] = (ns.args[0] as string).split(",");
  if (servers.length === ns.getPurchasedServerLimit()) {
    if (!ns.isRunning(upgradeScriptPath, "home")) {
      ns.run(upgradeScriptPath, 1, servers.join(","));
    }

    if (ns.isRunning(buyScriptPath, "home")) {
      ns.scriptKill(buyScriptPath, "home");
    }
  } else if (!ns.isRunning(buyScriptPath, "home")) {
    ns.run(buyScriptPath, 1, servers.join(","));
  }
}
