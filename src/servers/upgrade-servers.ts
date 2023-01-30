import config from "config";
import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";
import { Server } from "/../NetscriptDefinitions";

type ServerReadyForUpgrade = {
  hostname: string;
  newRam: number;
  upgradeCost: number;
};

let dynamicSleep = config.timeouts.long;
export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  if ((ns.args[0] as string) === "") {
    ns.tprint("No servers given to upgrade, exiting...");
  }
  const serverNames: string[] = (ns.args[0] as string).split(",");
  const servers = serverNames
    .map((serverName: string) => ns.getServer(serverName))
    .sort((a: Server, b: Server) => a.maxRam - b.maxRam)
    .map((server: Server) => server.hostname);

  let serversReadyForUpgrade: ServerReadyForUpgrade[] = [];

  while (true) {
    if (serversReadyForUpgrade.length) {
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
          ns.serverExists(serverReadyForUpgrade.hostname) &&
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
          ns.killall(serverReadyForUpgrade.hostname);
          if (
            ns.upgradePurchasedServer(
              serverReadyForUpgrade.hostname,
              serverReadyForUpgrade.newRam
            )
          ) {
            ns.print(
              `Upraded ${serverReadyForUpgrade.hostname} to ${serverReadyForUpgrade.newRam} ram.`
            );
            await copyScriptFilesToServer(ns, serverReadyForUpgrade.hostname);

            serversReadyForUpgrade = serversReadyForUpgrade.filter(
              (server: ServerReadyForUpgrade) =>
                server.hostname !== serverReadyForUpgrade.hostname
            );

            dynamicSleep = config.timeouts.short;
          } else {
            ns.print(`Upgrade of ${serverReadyForUpgrade.hostname} failed.`);
          }
        }
      }
    } else {
      for (const serverIndex in servers) {
        const targetServer = servers[serverIndex];
        if (!ns.serverExists(targetServer)) {
          continue;
        }
        const targetServerCurrentRam = ns.getServerMaxRam(targetServer);
        const maxPossibleRamServer = ns.getPurchasedServerMaxRam();
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
            ns.exec(
              config.scriptPaths.preparingToUpgradeScriptPath,
              targetServer
            );
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
