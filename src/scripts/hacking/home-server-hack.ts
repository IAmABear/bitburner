import getServers from "/scripts/utils/getServers.js";
import {
  growScriptPath,
  weakenScriptPath,
  hackScriptPath,
} from "/scripts/utils/scriptPaths.js";
import { medium } from "/scripts/utils/timeoutTimes";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  while (true) {
    const targetServers = await getServers(ns, {
      includeHome: false,
      includeGhost: false,
      mustHaveRootAccess: true,
    });
    const avaibleServers = Object.assign([], targetServers);

    const currentServer = "home";
    const targetServer = avaibleServers[avaibleServers.length - 1];
    const moneyThresh = ns.getServerMaxMoney(targetServer) * 0.8;
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

      if (threadCount !== NaN && threadCount !== Infinity && threadCount > 0) {
        ns.enableLog("ALL");
        ns.print(
          `Running hack on ${currentServer} with ${threadCount} threads`
        );
        ns.disableLog("ALL");
        ns.exec(hackScriptPath, currentServer, threadCount, targetServer);
      }
    }

    if (
      !ns.scriptRunning(weakenScriptPath, currentServer) &&
      !isWeakenThresholdReached
    ) {
      const scriptRAM = ns.getScriptRam(weakenScriptPath, currentServer);
      const threadCount = Math.floor(
        Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
      );

      if (threadCount !== NaN && threadCount !== Infinity && threadCount > 0) {
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

      if (threadCount !== NaN && threadCount !== Infinity && threadCount > 0) {
        ns.exec(growScriptPath, currentServer, threadCount, targetServer);
      }
    }

    avaibleServers.shift();

    await ns.sleep(medium);
  }
}
