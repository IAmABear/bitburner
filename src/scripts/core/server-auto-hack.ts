// @ts-nocheck
/** @param {NS} ns **/

async function crackOpenServer(ns, server) {
  const serverInfo = ns.getServer(server)
  if (serverInfo.hasRootAccess) {
      return
  }

  let openPortCount = 0;

  /**
   * For now just install all the things
   */

  if (ns.fileExists('HTTPWorm.exe',)) {
      ns.httpworm(server);
      openPortCount++
  }

  if (ns.fileExists('BruteSSH.exe')) {
      ns.brutessh(server);
      openPortCount++
  }

  if (ns.fileExists('FTPCrack.exe')) {
      ns.ftpcrack(server);
      openPortCount++
  }

  if (ns.fileExists('relaySTMP.exe')) {
      ns.relaysmtp(server);
      openPortCount++
  }

  if (ns.fileExists('SQLInject.exe')) {
      ns.sqlinject(server);
      openPortCount++
  }

  // Can't do this yet due to missing the Source-File 4-1
  // ns.installBackdoor(server);

  if (openPortCount >= ns.getServerNumPortsRequired(server)) {
      ns.nuke(server);
      ns.tprint(server + ' is hacked and we now have root access.')
  }
}

async function copyHackFilesToServer(ns, server) {
  const res = await ns.scp(
      [
          "/scripts/hacks/hack.js",
          "/scripts/hacks/grow.js",
          "/scripts/hacks/weaken.js"
      ],
      server
  )

  return res
}


const scannedServers = []

async function scanServer(ns, server) {
  const serversFound = ns.scan(server)

  for (const serverFoundIndex in serversFound) {
      const serverFound = serversFound[serverFoundIndex]
      if (!scannedServers.includes(serverFound) && !serverFound.includes("ghost-")) {
          if (!serverFound.includes('home')) {
              scannedServers.push(serverFound)
          }

          await scanServer(ns, serverFound)
      }
  }

  return scannedServers
}

let currentHackingLevel = 0;
export async function main(ns) {
    ns.tprint("Auto hack method")
  const servers = await scanServer(ns, "home")
    ns.tprint(servers)
  while (true) {
      if (currentHackingLevel !== ns.getHackingLevel()) {
          currentHackingLevel = ns.getHackingLevel()
          for (let i = 0; i < servers.length; i++) {
              const server = servers[i]
              if (!ns.hasRootAccess(server) || true) {
                  if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)) {
                      await crackOpenServer(ns, server);
                      ns.tprint(server)
                      await copyHackFilesToServer(ns, server);
                  }
              }
          }
      }

      await ns.sleep(1000)
  }
}
