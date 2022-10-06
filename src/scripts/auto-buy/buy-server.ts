export async function main(ns: NS): Promise<void> {
  const ram = Number(ns.args[0]) || 8;
  const i = await ns.getPurchasedServers().length;

  while ((await ns.getPurchasedServerLimit()) >= i) {
    if (ns.getPurchasedServerCost(ram) < ns.getServerMoneyAvailable("home")) {
      const targetServer = await ns.purchaseServer("ghost-" + ram, ram);
      ns.print(`${targetServer} bought`);
      await ns.scp(
        [
          "/scripts/hacks/hack.js",
          "/scripts/hacks/grow.js",
          "/scripts/hacks/weaken.js",
        ],
        targetServer
      );
    }

    await ns.sleep(1000);
  }
}
