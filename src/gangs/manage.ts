import { GangTaskStats } from "/../NetscriptDefinitions";
import config from "config";

const levelThreshold = 300;

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  const gangInfo = ns.gang.getGangInformation();

  const tasks = ns.gang
    .getTaskNames()
    .map((taskName: string) => ns.gang.getTaskStats(taskName))
    .filter((task: GangTaskStats) =>
      gangInfo.isHacking ? task.isHacking : task.isCombat
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
        ((gangInfo.isHacking && ascResult.str >= 1.25) ||
          (gangInfo.isHacking && ascResult.hack >= 1.25))
      ) {
        ns.gang.ascendMember(member);
      }

      if (
        (gangInfo.isHacking && memberInfo.str <= levelThreshold) ||
        (gangInfo.isHacking && memberInfo.hack <= levelThreshold)
      ) {
        ns.gang.setMemberTask(
          member,
          gangInfo.isHacking ? "Train Combat" : "Train Hacking"
        );
      } else {
        ns.gang.setMemberTask(member, prefferedTask.name);
      }
    });

    await ns.sleep(config.timeouts.long);
  }
}
