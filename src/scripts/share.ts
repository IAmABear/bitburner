import { skip } from "/scripts/utils/timeoutTimes";

export async function main(ns: NS): Promise<void> {
  while (true) {
    await ns.share();
    await ns.sleep(skip);
  }
}
