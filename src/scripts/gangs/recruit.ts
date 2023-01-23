import { long, short } from "/scripts/utils/timeoutTimes";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  while (true) {
    ns.gang.recruitMember(`ghost-${Date.now()}`);

    await ns.sleep(ns.gang.getMemberNames().length < 12 ? short : long);
  }
}
