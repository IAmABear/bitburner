// @ts-nocheck
export async function main(ns) {
  const servers = await ns.getPurchasedServers();

  while (servers.length > 0) {
      for (const serverIndex in servers) {
          const targetServer = servers[serverIndex]
          if (! await ns.serverExists(targetServer)) {
              continue
          }
          const targetServerCurrentRam = await ns.getServerMaxRam(targetServer)
          const maxPossibleRamServer = await ns.getPurchasedServerMaxRam(targetServer)
          const newTargetRam = targetServerCurrentRam * 2;

          if ((newTargetRam < maxPossibleRamServer) && (ns.getPurchasedServerCost(newTargetRam) < ns.getServerMoneyAvailable("home"))) {
              ns.tprint('Upgrading ' + targetServer + ' server from ' + targetServerCurrentRam + ' ram to ' + newTargetRam + 'ram.')
              await ns.killall(targetServer);
              await ns.deleteServer(targetServer)

              const newServerName = await ns.purchaseServer("ghost-" + newTargetRam, Number(newTargetRam))

              if (! await ns.serverExists(newServerName)) {
                  continue
              }

              await ns.scp(
                  [
                      "/scripts/hacks/hack.js",
                      "/scripts/hacks/grow.js",
                      "/scripts/hacks/weaken.js"
                  ],
                  newServerName
              )
              ns.tprint('Finished upgrading ' + targetServer + ' server from ' + targetServerCurrentRam + ' ram to ' + newTargetRam + 'ram.')
          }

          await ns.sleep(1000)
      }
  }
}
