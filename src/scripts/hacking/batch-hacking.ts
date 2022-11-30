export async function main(ns: NS): Promise<void> {
  ns.exec(
    "/scripts/hacking/batch/batch-hacking-v1.js",
    "home",
    undefined,
    ...ns.args
  );
}
