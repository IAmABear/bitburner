import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";
import crackOpenServer from "/utils/crackOpenServer";
import scanServer from "/utils/scanServer";
import config from "config";

let currentHackingLevel = 0;
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  const servers = await scanServer(ns, "home");

  while (true) {
    if (currentHackingLevel !== ns.getHackingLevel()) {
      currentHackingLevel = ns.getHackingLevel();
      for (let i = 0; i < servers.length; i++) {
        const server = servers[i];

        await crackOpenServer(ns, server);

        if (!ns.hasRootAccess(server)) {
          if (currentHackingLevel >= ns.getServerRequiredHackingLevel(server)) {
            await copyScriptFilesToServer(ns, server);
          }
        }
      }
    }

    await ns.sleep(config.timeouts.medium);
  }
}
