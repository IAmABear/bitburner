import config from "config";
import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";
import { Server } from "/../NetscriptDefinitions";
import colorPicker from "/utils/colorPicker";

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

  let serversReadyForUpgrade: ServerReadyForUpgrade[] = [];

  while (true) {
    ns.print("------");
    const servers = serverNames.map((serverName: string) =>
      ns.getServer(serverName)
    );
    const sortedServers = servers.sort(
      (a: Server, b: Server) => a.maxRam - b.maxRam
    );

    ns.print(
      `Money avaible: ${colorPicker(
        `${Math.ceil(ns.getServerMoneyAvailable("home"))}`,
        "green"
      )}`
    );
    ns.print(
      `Upgrade costs: ${Math.ceil(
        ns.getPurchasedServerUpgradeCost(
          sortedServers[0].hostname,
          sortedServers[0].maxRam * 2
        )
      )} / ${Math.ceil(
        ns.getPurchasedServerUpgradeCost(
          sortedServers[sortedServers.length - 1].hostname,
          sortedServers[sortedServers.length - 1].maxRam * 2
        )
      )}.`
    );

    if (serversReadyForUpgrade.length) {
      for (const server of serversReadyForUpgrade) {
        ns.print(
          `${server.hostname} to be upgraded to ${
            server.newRam
          } for ${colorPicker(`${server.upgradeCost}`, "green")}`
        );
      }

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
              `Upgraded ${serverReadyForUpgrade.hostname} to ${serverReadyForUpgrade.newRam} ram.`
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
      for (const targetServer of sortedServers) {
        if (!ns.serverExists(targetServer.hostname)) {
          continue;
        }
        const targetServerCurrentRam = targetServer.maxRam;
        const maxPossibleRamServer = ns.getPurchasedServerMaxRam();
        const newTargetRam = targetServerCurrentRam * 2;

        const upgradeCost = ns.getPurchasedServerCost(newTargetRam);

        if (
          newTargetRam < maxPossibleRamServer &&
          ns.getServerMoneyAvailable("home") >=
            upgradeCost +
              serversReadyForUpgrade.reduce(
                (totalPrice: number, server: ServerReadyForUpgrade) =>
                  totalPrice + server.upgradeCost,
                0
              )
        ) {
          try {
            ns.exec(
              config.scriptPaths.preparingToUpgradeScriptPath,
              targetServer.hostname
            );
            ns.print(`Adding ${targetServer.hostname} to the upgrade list.`);
            serversReadyForUpgrade.push({
              hostname: targetServer.hostname,
              newRam: newTargetRam,
              upgradeCost,
            });
          } catch (e) {
            ns.print(
              `Couldnt target ${targetServer.hostname} for upgrade due to an error`
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
