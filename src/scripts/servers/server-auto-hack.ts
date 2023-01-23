import crackOpenServer from "/scripts/utils/crackOpenServer";
import scanServer from "/scripts/utils/scanServer";
import {
  growScriptPath,
  weakenScriptPath,
  hackScriptPath,
  preparingToUpgradeScriptPath,
} from "/scripts/utils/scriptPaths.js";
import { medium } from "/scripts/utils/timeoutTimes";

async function copyHackFilesToServer(ns: NS, server: string): Promise<boolean> {
  const res = await ns.scp(
    [
      hackScriptPath,
      growScriptPath,
      weakenScriptPath,
      preparingToUpgradeScriptPath,
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
        if (!ns.hasRootAccess(server) || true) {
          if (
            ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)
          ) {
            await crackOpenServer(ns, server);
            await copyHackFilesToServer(ns, server);
          }
        }
      }
    }

    await ns.sleep(medium);
  }
}
