// @ts-nocheck
/** @param {NS} ns **/
export async function main(ns) {
  ns.tprint("Start")
  /**
   * Start the auto hacking
   */
  if (!ns.isRunning('/scripts/core/server-auto-hack.js', "home")) {
      ns.tprint("Start running auto hack")
      await ns.run('/scripts/core/server-auto-hack.js')
  } else {
    ns.tprint("Auto hack already running")
  }

  if (ns.getPurchasedServers().length === 25) {
      ns.run('/scripts/auto-buy/upgrade-servers.js')
  } else if (!ns.isRunning('/scripts/auto-buy/buy-server.js', "home")) {
      ns.run('/scripts/auto-buy/buy-server.js')
  }

  /**
   * Start all servers and copy the files
   */
  const servers = await ns.getPurchasedServers()
  let i = 0;

  while (servers.length > 0 && i < servers.length) {
      const targetServer = servers[i]
      ns.tprint("Starting statup on server: " + targetServer)

      /**
       * Remove all previous script files
       */
      const serverFiles = ns.ls(targetServer, "js");
      for (const serverFile in serverFiles) {
          await ns.killall(targetServer);
          ns.rm(serverFiles[serverFile], targetServer)
      }

      /**
       * Copy hack-server file to server if not present and execute it
       */
      await ns.scp(
          [
              "/scripts/hacks/hack.js",
              "/scripts/hacks/grow.js",
              "/scripts/hacks/weaken.js"
          ],
          targetServer
      )

      // Onwards to the next server
      i = i + 1;
  }

  /**
   * Start the hub so all the servers start working
   */
  if (!ns.isRunning('/scripts/core/hub.js', "home")) {
      await ns.run('/scripts/core/hub.js')
  }
}
