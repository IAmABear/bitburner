import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";

export async function main(ns: NS): Promise<void> {
  if (!ns.isRunning("/scripts/hacking/server-auto-hack.js", "home")) {
    await ns.run("/scripts/hacking/server-auto-hack.js");
  }

  if (!ns.isRunning("/scripts/servers/auto-buy.js", "home")) {
    await ns.run("/scripts/servers/auto-buy.js");
  }

  const servers = await ns.getPurchasedServers();
  for (let index = 0; index < servers.length; index++) {
    const targetServer = servers[index];

    const serverFiles = ns.ls(targetServer, "js");
    for (const serverFile in serverFiles) {
      await ns.killall(targetServer);
      ns.rm(serverFiles[serverFile], targetServer);
    }

    await ns.scp(
      [hackScriptPath, growScriptPath, weakenScriptPath],
      targetServer
    );
  }

  if ((ns.args[0] as string) === "batch") {
    if (!ns.isRunning("/scripts/hacking/batch-hackingjs", "home")) {
      await ns.run("/scripts/hacking/batch-hacking.js");
    }
  } else {
    if (!ns.isRunning("/scripts/hacking/hub.js", "home")) {
      await ns.run("/scripts/hacking/hub.js");
    }
  }
}
