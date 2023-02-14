import copyScriptFilesToServer from "/utils/copyScriptFilesToServer";

export async function main(ns: NS): Promise<void> {
  const servers = await ns.getPurchasedServers();

  if (!ns.isRunning("/servers/auto-buy.js", "home")) {
    await ns.run("/servers/auto-buy.js", 1, servers.join(","));
  }

  if (!ns.isRunning("/servers/server-auto-hack.js", "home")) {
    await ns.run("/servers/server-auto-hack.js");
  }

  for (const server of servers) {
    ns.exec("clean.js", "home", undefined, server as string);

    await copyScriptFilesToServer(ns, server);
  }

  if (ns.getServer("home").maxRam <= 3200) {
    await ns.run("/hacking/event-based/v1.js");
  } else {
    await ns.run("/hacking/event-hacking.js", undefined, "all");
  }
}
