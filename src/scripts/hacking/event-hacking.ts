const eventHackingV1 = "/scripts/hacking/event-based/v1.js";

export async function main(ns: NS): Promise<void> {
  if (!ns.isRunning(eventHackingV1, "home")) {
    ns.exec(eventHackingV1, "home", undefined, ...ns.args);
  }
}
