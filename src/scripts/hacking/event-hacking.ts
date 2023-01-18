const hubHacking = "/scripts/hacking/hub.js";
const eventHackingV2 = "/scripts/hacking/event-based/v2.js";

export async function main(ns: NS): Promise<void> {
  while (true) {
    if (ns.getHackingLevel() >= 20) {
      if (!ns.isRunning(eventHackingV2, "home")) {
        if (ns.isRunning(eventHackingV1, "home")) {
          ns.kill(eventHackingV1, "home");
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
  }
}
