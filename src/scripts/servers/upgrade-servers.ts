import {
  growScriptPath,
  hackScriptPath,
  preparingToUpgradeScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import { long, short } from "/scripts/utils/timeoutTimes";

type ServerReadyForUpgrade = {
  hostname: string;
  newRam: number;
  upgradeCost: number;
};

let dynamicSleep = long;
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
          !ns.scriptRunning(hackScriptPath, serverReadyForUpgrade.hostname) &&
          !ns.scriptRunning(weakenScriptPath, serverReadyForUpgrade.hostname) &&
          !ns.scriptRunning(growScriptPath, serverReadyForUpgrade.hostname)
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
                hackScriptPath,
                growScriptPath,
                weakenScriptPath,
                preparingToUpgradeScriptPath,
              ],
              newServerName
            );
          }

          serversReadyForUpgrade = serversReadyForUpgrade.filter(
            (server: ServerReadyForUpgrade) =>
              server.hostname !== serverReadyForUpgrade.hostname
          );

          dynamicSleep = short;
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
          ns.exec(preparingToUpgradeScriptPath, targetServer);
          serversReadyForUpgrade.push({
            hostname: targetServer,
            newRam: newTargetRam,
            upgradeCost,
          });
        } else {
          dynamicSleep = long;

          const currentServers = await ns.getPurchasedServers();
          const allServerRams = await currentServers.map((server) =>
            ns.getServerMaxRam(server)
          );

          // Check if we still have servers under a certain RAM threshold.
          // If not kill the upgrade script to free up RAM.
          if (allServerRams.find((serverRAM) => serverRAM <= 100000)) {
            continue;
          } else {
            break;
          }
        }
      }
    }

    await ns.sleep(dynamicSleep);
  }
}
