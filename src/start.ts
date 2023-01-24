import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";

export async function main(ns: NS): Promise<void> {
  if (!ns.isRunning("/servers/auto-buy.js", "home")) {
    await ns.run("/servers/auto-buy.js");
  }

  if (!ns.isRunning("/servers/server-auto-hack.js", "home")) {
    await ns.run("/servers/server-auto-hack.js");
  }

  const servers = await ns.getPurchasedServers();
  for (let index = 0; index < servers.length; index++) {
    const targetServer = servers[index];

    const serverFiles = ns.ls(targetServer, "js");
    for (const serverFile in serverFiles) {
      await ns.killall(targetServer);
      ns.rm(serverFiles[serverFile], targetServer);
    }

    await copyScriptFilesToServer(ns, targetServer);
  }

  if (ns.getServer("home").maxRam <= 3200) {
    await ns.run("/hacking/event-based/v1.js");
  } else {
    await ns.run("/hacking/event-hacking.js", undefined, "all");
  }
}
