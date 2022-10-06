import getServers from "/scripts/utils/getServers.js";

export async function main(ns: NS): Promise<void> {
  const servers = await getServers(ns, {
    includeHome: false,
    includeGhost: true,
    mustHaveRootAccess: true,
  });

  while (true) {
    servers.forEach((currentServer) => {
      const isGhostServer = currentServer.includes("ghost-");

      if (isGhostServer) {
        return;
      }

      const moneyThresh = ns.getServerMaxMoney(currentServer) * 0.5;
      const securityThresh = ns.getServerMinSecurityLevel(currentServer) + 5;

      if (!ns.serverExists(currentServer)) {
        return;
      }

      const serverMaxRam = ns.getServerMaxRam(currentServer);
      const serverUsedRam = ns.getServerUsedRam(currentServer);

      const isWeakenThresholdReached =
        ns.getServerSecurityLevel(currentServer) > securityThresh;
      const isGrowThresholdReached =
        ns.getServerMoneyAvailable(currentServer) < moneyThresh;
      const isHackThresholdReached = !isGrowThresholdReached;

      ns.print(`Max ram: ${serverMaxRam}; Using: ${serverUsedRam}`);
      ns.print(
        `Thresholds reached weaken: ${isWeakenThresholdReached} grow: ${isGrowThresholdReached} hack: ${isHackThresholdReached}`
      );
    });

    await ns.sleep(60000);
  }
}
