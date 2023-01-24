import getServers from "/utils/getServers";
import config from "config";

const eventHackingV1 = "/hacking/event-based/v1.js";
const eventHackingV2 = "/hacking/event-based/v2.js";

export async function main(ns: NS): Promise<void> {
  while (true) {
    const ghostServers = await getServers(ns, {
      includeGhost: true,
      onlyGhost: true,
      includeHome: false,
    });
    if (
      ns.getHackingLevel() >= 20 &&
      ghostServers.filter(
        (server: string) => ns.getServer(server).maxRam >= 1024
      ).length > 2
    ) {
      if (!ns.isRunning(eventHackingV2, "home", ...ns.args)) {
        if (ns.isRunning(eventHackingV1, "home", ...ns.args)) {
          ns.kill(eventHackingV1, "home");
        }

        ns.exec(eventHackingV2, "home", undefined, ...ns.args);

        break;
      }
    } else {
      if (!ns.isRunning(eventHackingV1, "home", ...ns.args)) {
        ns.exec(eventHackingV1, "home", undefined, ...ns.args);
      }
    }

    await ns.sleep(config.timeouts.long);
  }
}
