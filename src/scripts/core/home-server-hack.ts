// @ts-nocheck
/** @param {NS} ns **/
import getServers from "/scripts/utils/getServers.js";

const growScriptPath = "/scripts/hacks/grow.js";
const weakenScriptPath = "/scripts/hacks/weaken.js";
const hackScriptPath = "/scripts/hacks/hack.js";

export async function main(ns) {
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
      var scriptRAM = ns.getScriptRam(hackScriptPath, currentServer);
      var threadCount = Math.ceil(
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
      var scriptRAM = ns.getScriptRam(weakenScriptPath, currentServer);
      var threadCount = Math.floor(
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
      var scriptRAM = ns.getScriptRam(growScriptPath, currentServer);
      var threadCount = Math.floor(
        Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
      );

      if (threadCount !== NaN && threadCount !== Infinity && threadCount > 0) {
        ns.exec(growScriptPath, currentServer, threadCount, targetServer);
      }
    }

    avaibleServers.shift();

    await ns.sleep(100);
  }
}
