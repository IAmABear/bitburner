import getServers from "/scripts/utils/getServers.js";
import {
  growScriptPath,
  weakenScriptPath,
  hackScriptPath,
} from "/scripts/utils/scriptPaths.js";
import { short } from "/scripts/utils/timeoutTimes";

/**
 * Initial centralized hacking hub for mass hacking.
 * The goal of this hub is simply to weaken/grwo/hack
 * as many servers as fast as possible without any
 * regard to efficienty. This works fine for initial
 * money gathering but will be quite ineffecient later on.
 *
 * @param ns The bitburner NS scope
 */
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  while (true) {
    const servers = await getServers(ns, {
      includeHome: false,
      includeGhost: true,
    });
    const targetServers = await getServers(ns, {
      includeHome: false,
      includeGhost: false,
      mustHaveRootAccess: true,
    });
    const filteredServers = targetServers.filter(
      (server: string) => server !== "foodnstuff"
    );
    let avaibleServers = Object.assign([], filteredServers);

    for (const serverIndex in servers) {
      if (avaibleServers.length === 0) {
        avaibleServers = Object.assign([], filteredServers);
      }

      const currentServer = servers[serverIndex];
      const isGhostServer = currentServer.includes("ghost-");
      const targetServer = isGhostServer ? avaibleServers[0] : currentServer;
      const moneyThresh = ns.getServerMaxMoney(targetServer) * 0.5;
      const securityThresh = ns.getServerMinSecurityLevel(targetServer) + 5;

      if (!ns.serverExists(currentServer)) {
        continue;
      }

      const serverMaxRam = ns.getServerMaxRam(currentServer);
      const serverUsedRam = ns.getServerUsedRam(currentServer);

      const isWeakenThresholdReached =
        ns.getServerSecurityLevel(targetServer) > securityThresh;
      const isGrowThresholdReached =
        ns.getServerMoneyAvailable(targetServer) < moneyThresh;
      const isHackThresholdReached = !isGrowThresholdReached;

      if (
        !ns.scriptRunning(hackScriptPath, currentServer) &&
        isHackThresholdReached
      ) {
        const scriptRAM = ns.getScriptRam(hackScriptPath, currentServer);
        const threadCount = Math.ceil(
          Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
        );

        if (
          threadCount !== NaN &&
          threadCount !== Infinity &&
          threadCount > 0
        ) {
          ns.exec(hackScriptPath, currentServer, threadCount, targetServer);
        }
      }

      if (
        !ns.scriptRunning(weakenScriptPath, currentServer) &&
        isWeakenThresholdReached
      ) {
        const scriptRAM = ns.getScriptRam(weakenScriptPath, currentServer);
        const threadCount = Math.floor(
          Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
        );

        if (
          threadCount !== NaN &&
          threadCount !== Infinity &&
          threadCount > 0
        ) {
          ns.exec(weakenScriptPath, currentServer, threadCount, targetServer);
        }
      }

      if (
        !ns.scriptRunning(growScriptPath, currentServer) &&
        isGrowThresholdReached
      ) {
        const scriptRAM = ns.getScriptRam(growScriptPath, currentServer);
        const threadCount = Math.floor(
          Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
        );

        if (
          threadCount !== NaN &&
          threadCount !== Infinity &&
          threadCount > 0
        ) {
          ns.exec(growScriptPath, currentServer, threadCount, targetServer);
        }
      }

      avaibleServers.shift();

      await ns.sleep(short);
    }
  }
}
