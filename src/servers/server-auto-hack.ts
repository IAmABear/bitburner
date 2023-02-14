import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";
import crackOpenServer from "/utils/crackOpenServer";
import scanServer from "/utils/scanServer";
import config from "config";

let currentHackingLevel = 0;
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  let servers = await scanServer(ns, "home");

  while (true) {
    if (currentHackingLevel !== ns.getHackingLevel()) {
      currentHackingLevel = ns.getHackingLevel();

      for (const currentServer of servers) {
        await crackOpenServer(ns, currentServer);

        if (!ns.hasRootAccess(currentServer)) {
          if (
            currentHackingLevel >=
            ns.getServerRequiredHackingLevel(currentServer)
          ) {
            await copyScriptFilesToServer(ns, server);

            servers = servers.filter(
              (server: string) => server !== currentServer
            );
          }
        }
      }
    }

    await ns.sleep(config.timeouts.medium);
  }
}
