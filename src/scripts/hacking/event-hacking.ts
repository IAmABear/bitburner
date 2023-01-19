import { long } from "/scripts/utils/timeoutTimes";

const eventHackingV1 = "/scripts/hacking/event-based/v1.js";
const eventHackingV2 = "/scripts/hacking/event-based/v2.js";

export async function main(ns: NS): Promise<void> {
  while (true) {
    if (
      ns.getHackingLevel() >= 20 &&
      ns.getServer("home").maxRam >= 3200 &&
      ns.getPurchasedServers().length >= 20
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

    await ns.sleep(long);
  }
}
