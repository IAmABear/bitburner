import config from "config";

const scripts = [
  config.scriptPaths.gangs.recruit,
  config.scriptPaths.gangs.manage,
];

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  if (ns.gang.inGang()) {
    for (const script of scripts) {
      if (!ns.scriptRunning(script, "home")) {
        ns.exec(script, "home");
      }
    }
  }
}
