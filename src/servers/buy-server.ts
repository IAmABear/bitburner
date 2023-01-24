import config from "config";
import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";

let dynamicSleep = config.timeouts.long;
export async function main(ns: NS): Promise<void> {
  const ram = Number(ns.args[0]) || 8;
  const servers =
    (ns.args[1] as string) !== "" ? (ns.args[1] as string).split(",") : [];

  while (true) {
    if (ns.getPurchasedServerLimit() >= servers.length) {
      if (ns.getPurchasedServerCost(ram) < ns.getServerMoneyAvailable("home")) {
        dynamicSleep = config.timeouts.skip;
        const newServer = await ns.purchaseServer("ghost", ram);

        if (newServer) {
          servers.push(newServer);
          await copyScriptFilesToServer(ns, newServer);
        }
      } else {
        dynamicSleep = config.timeouts.long;
      }

      await ns.sleep(dynamicSleep);
    } else {
      ns.exec("/servers/upgrade-servers.js", "home", 1, servers.join(","));
      break;
    }
  }
}
