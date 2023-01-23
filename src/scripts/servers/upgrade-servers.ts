import config from "config";

type ServerReadyForUpgrade = {
  hostname: string;
  newRam: number;
  upgradeCost: number;
};

let dynamicSleep = config.timeouts.long;
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  let serversReadyForUpgrade: ServerReadyForUpgrade[] = [];

  while (true) {
    const servers = await ns.getPurchasedServers();
    ns.print(serversReadyForUpgrade.length);
    if (serversReadyForUpgrade.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const serverReadyForUpgradeIndex in serversReadyForUpgrade) {
        const serverReadyForUpgrade =
          serversReadyForUpgrade[serverReadyForUpgradeIndex] ||
          serversReadyForUpgrade[0];

        if (!serverReadyForUpgrade) {
          continue;
        }

        if (
          serverReadyForUpgrade &&
          !ns.scriptRunning(
            config.scriptPaths.hackScriptPath,
            serverReadyForUpgrade.hostname
          ) &&
          !ns.scriptRunning(
            config.scriptPaths.weakenScriptPath,
            serverReadyForUpgrade.hostname
          ) &&
          !ns.scriptRunning(
            config.scriptPaths.growScriptPath,
            serverReadyForUpgrade.hostname
          )
        ) {
          if (ns.serverExists(serverReadyForUpgrade.hostname)) {
            await ns.killall(serverReadyForUpgrade.hostname);
            await ns.deleteServer(serverReadyForUpgrade.hostname);

            const newServerName = await ns.purchaseServer(
              "ghost-" + serverReadyForUpgrade.newRam,
              Number(serverReadyForUpgrade.newRam)
            );

            if (!(await ns.serverExists(newServerName))) {
              continue;
            }

            await ns.scp(
              [
                config.scriptPaths.hackScriptPath,
                config.scriptPaths.growScriptPath,
                config.scriptPaths.weakenScriptPath,
                config.scriptPaths.preparingToUpgradeScriptPath,
              ],
              newServerName
            );
          }

          serversReadyForUpgrade = serversReadyForUpgrade.filter(
            (server: ServerReadyForUpgrade) =>
              server.hostname !== serverReadyForUpgrade.hostname
          );

          dynamicSleep = config.timeouts.short;
        }
      }
    } else {
      for (const serverIndex in servers) {
        const targetServer = servers[serverIndex];
        if (!(await ns.serverExists(targetServer))) {
          continue;
        }
        const targetServerCurrentRam = await ns.getServerMaxRam(targetServer);
        const maxPossibleRamServer = await ns.getPurchasedServerMaxRam();
        const newTargetRam = targetServerCurrentRam * 2;

        const upgradeCost = ns.getPurchasedServerCost(newTargetRam);
        if (
          newTargetRam < maxPossibleRamServer &&
          upgradeCost +
            serversReadyForUpgrade.reduce(
              (totalPrice: number, server: ServerReadyForUpgrade) =>
                totalPrice + server.upgradeCost,
              0
            ) <
            ns.getServerMoneyAvailable("home")
        ) {
          try {
            ns.exec(preparingToUpgradeScriptPath, targetServer);
            serversReadyForUpgrade.push({
              hostname: targetServer,
              newRam: newTargetRam,
              upgradeCost,
            });
          } catch (e) {
            ns.print(
              `Couldnt target ${targetServer} for upgrade due to an error`
            );
          }
        } else {
          dynamicSleep =
            serversReadyForUpgrade.length > 0
              ? config.timeouts.skip
              : config.timeouts.long;
        }
      }
    }

    await ns.sleep(dynamicSleep);
  }
}
