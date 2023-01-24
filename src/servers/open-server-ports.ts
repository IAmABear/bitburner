import crackOpenServer from "/utils/crackOpenServer";
import scanServer from "/utils/scanServer";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  const servers = await scanServer(ns, "home");

  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];

    if (ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)) {
      await crackOpenServer(ns, server);
    }
  }
}
