import { long } from "/scripts/utils/timeoutTimes";

const hubHacking = "/scripts/hacking/hub.js";
const eventHackingV2 = "/scripts/hacking/event-based/v2.js";

export async function main(ns: NS): Promise<void> {
  while (true) {
    if (ns.getHackingLevel() >= 20 && ns.getServer("home").maxRam >= 2048) {
      if (!ns.isRunning(eventHackingV2, "home")) {
        if (ns.isRunning(hubHacking, "home")) {
          ns.kill(hubHacking, "home");
        }

        ns.exec(eventHackingV2, "home", undefined, ...ns.args);

        break;
      }
    } else {
      if (!ns.isRunning(hubHacking, "home")) {
        if (ns.isRunning(eventHackingV2, "home")) {
          ns.kill(eventHackingV2, "home");
        }

        ns.exec(hubHacking, "home", undefined, ...ns.args);
      }
    }

    await ns.sleep(long);
  }
}
