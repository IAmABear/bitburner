const batchHackingV1 = "/scripts/hacking/batch/batch-hacking-v1.js";
export async function main(ns: NS): Promise<void> {
  if (!ns.isRunning(batchHackingV1, "home")) {
    ns.exec(batchHackingV1, "home", undefined, ...ns.args);
  }
}
