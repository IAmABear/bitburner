import config from "config";

export async function main(ns: NS): Promise<void> {
  while (true) {
    await ns.share();
    await ns.sleep(config.timeouts.skip);
  }
}
