export async function main(ns: NS): Promise<void> {
  const hostname = ns.args[0] as string;

  while (true) {
    if (
      ns.getServerSecurityLevel(hostname) >
      ns.getServerMinSecurityLevel(hostname)
    ) {
      await ns.weaken(hostname);
    } else if (
      ns.getServerMoneyAvailable(hostname) < ns.getServerMaxMoney(hostname)
    ) {
      await ns.grow(hostname);
    } else {
      await ns.hack(hostname);
    }
  }
}
