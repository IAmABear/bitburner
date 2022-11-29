import crackOpenServer from "/scripts/utils/crackOpenServer";
import {
  growScriptPath,
  weakenScriptPath,
  hackScriptPath,
} from "/scripts/utils/scriptPaths.js";
import { medium } from "/scripts/utils/timeoutTimes";

async function copyHackFilesToServer(ns: NS, server: string): Promise<boolean> {
  const res = await ns.scp(
    [hackScriptPath, growScriptPath, weakenScriptPath],
    server
  );

  return res;
}

const scannedServers: string[] = [];

async function scanServer(ns: NS, server: string) {
  const serversFound = ns.scan(server);

  for (const serverFoundIndex in serversFound) {
    const serverFound = serversFound[serverFoundIndex];
    if (
      !scannedServers.includes(serverFound) &&
      !serverFound.includes("ghost-")
    ) {
      if (!serverFound.includes("home")) {
        scannedServers.push(serverFound);
      }

      await scanServer(ns, serverFound);
    }
  }

  return scannedServers;
}

let currentHackingLevel = 0;
export async function main(ns: NS): Promise<void> {
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
