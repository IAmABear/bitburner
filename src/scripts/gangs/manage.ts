import { GangTaskStats } from "/../NetscriptDefinitions";
import { long } from "/scripts/utils/timeoutTimes";

const isCriminalGang = (type: string) => type === "criminal";
const isHackingGang = (type: string) => type === "hacking";
const levelThreshold = 300;

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  const gangType =
    (ns.args[0] as string) !== "hacking" ? "criminal" : "hacking";
  const preferredTaskType =
    (ns.args[1] as string) !== "money" ? "respect" : "money";

  const tasks = ns.gang
    .getTaskNames()
    .map((taskName: string) => ns.gang.getTaskStats(taskName))
    .filter((task: GangTaskStats) =>
      isCriminalGang(gangType) ? task.isCombat : task.isHacking
    );

  while (true) {
    const gangMembers = ns.gang.getMemberNames();
    ns.print(`gangMembers.length: ${gangMembers.length}`);
    const prefferedTask = tasks.sort((a: GangTaskStats, b: GangTaskStats) => {
      if (preferredTaskType === "money" || gangMembers.length >= 12) {
        return b.baseMoney - a.baseMoney;
      } else {
        return b.baseRespect - a.baseRespect;
      }
    })[0];

    gangMembers.forEach((member: string) => {
      const memberInfo = ns.gang.getMemberInformation(member);
      const ascResult = ns.gang.getAscensionResult(member);

      if (
        ascResult &&
        ((isCriminalGang(gangType) && ascResult.str >= 1.25) ||
          (isHackingGang(gangType) && ascResult.hack >= 1.25))
      ) {
        ns.gang.ascendMember(member);
      }

      if (
        (isCriminalGang(gangType) && memberInfo.str <= levelThreshold) ||
        (isHackingGang(gangType) && memberInfo.hack <= levelThreshold)
      ) {
        ns.gang.setMemberTask(
          member,
          isCriminalGang(gangType) ? "Train Combat" : "Train Hacking"
        );
      } else {
        ns.gang.setMemberTask(
          member,
          isCriminalGang(gangType) ? prefferedTask.name : "Train Hacking"
        );
      }
    });

    await ns.sleep(long);
  }
}
