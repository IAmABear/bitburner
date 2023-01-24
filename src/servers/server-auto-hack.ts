import crackOpenServer from "/utils/crackOpenServer";
import scanServer from "/utils/scanServer";
import config from "config";

async function copyHackFilesToServer(ns: NS, server: string): Promise<boolean> {
  const res = await ns.scp(
    [
      config.scriptPaths.hackScriptPath,
      config.scriptPaths.growScriptPath,
      config.scriptPaths.weakenScriptPath,
      config.scriptPaths.preparingToUpgradeScriptPath,
    ],
    server
  );

  return res;
}

let currentHackingLevel = 0;
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  const servers = await scanServer(ns, "home");

  while (true) {
    if (currentHackingLevel !== ns.getHackingLevel()) {
      currentHackingLevel = ns.getHackingLevel();
      for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        if (!ns.hasRootAccess(server)) {
          if (
            ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)
          ) {
            await crackOpenServer(ns, server);
            await copyHackFilesToServer(ns, server);
          }
        } else {
          await crackOpenServer(ns, server);
        }
      }
    }

    await ns.sleep(config.timeouts.medium);
  }
}
