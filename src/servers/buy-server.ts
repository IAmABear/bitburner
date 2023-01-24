import config from "config";
import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";

let dynamicSleep = config.timeouts.long;
export async function main(ns: NS): Promise<void> {
  const ram = Number(ns.args[0]) || 8;

  while (true) {
    if (ns.getPurchasedServerLimit() >= ns.getPurchasedServers().length) {
      if (ns.getPurchasedServerCost(ram) < ns.getServerMoneyAvailable("home")) {
        dynamicSleep = config.timeouts.skip;
        const targetServer = await ns.purchaseServer("ghost-" + ram, ram);

        if (targetServer) {
          await copyScriptFilesToServer(ns, targetServer);
        }
      } else {
        dynamicSleep = config.timeouts.long;
      }

      await ns.sleep(dynamicSleep);
    } else {
      ns.exec("/servers/upgrade-servers.js", "home");
      break;
    }
  }
}
