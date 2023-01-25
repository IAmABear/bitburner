import {
  EquipmentStats,
  GangMemberInfo,
  GangTaskStats,
} from "/../NetscriptDefinitions";
import config from "config";

const levelThreshold = 300;
const augmentationTypeEquipment = "Augmentation";
const combatTypeEquipment = ["Weapon", "Armor", "Vehicle"];
const hackingTypeEquipments = ["Rootkit"];

interface CustomEquipment extends EquipmentStats {
  cost: number;
  type: string;
  name: string;
}

const buyAvaibleEquipment = (
  ns: NS,
  member: GangMemberInfo,
  equipments: CustomEquipment[]
) => {
  for (let index = 0; index < equipments.length; index++) {
    const equipment = equipments[index];

    if (equipment.cost <= ns.getServerMoneyAvailable("home")) {
      ns.gang.purchaseEquipment(member.name, equipment.name);
    }
  }
};

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  const gangInfo = ns.gang.getGangInformation();
  ns.print(gangInfo);
  const tasks = ns.gang
    .getTaskNames()
    .map((taskName: string) => ns.gang.getTaskStats(taskName))
    .filter((task: GangTaskStats) =>
      gangInfo.isHacking ? task.isHacking : task.isCombat
    );
  const territoryWarfareTask = tasks.filter(
    (task) => task.name === "Territory Warfare"
  )[0];
  const preferredTaskType = ns.args[0] as string;

  if (!ns.scriptRunning("/gangs/recruit.js", "home")) {
    ns.exec("/gangs/recruit.js", "home");
  }

  const equipmentNames = ns.gang.getEquipmentNames();
  const equipments: CustomEquipment[] = equipmentNames.map(
    (equipmentName: string) => ({
      ...ns.gang.getEquipmentStats(equipmentName),
      cost: ns.gang.getEquipmentCost(equipmentName),
      type: ns.gang.getEquipmentType(equipmentName),
      name: equipmentName,
    })
  );
  const augmentationEquipment = equipments.filter(
    (equipment) => equipment.type === augmentationTypeEquipment
  );
  const combatEquipment = equipments.filter((equipment) =>
    combatTypeEquipment.includes(equipment.type)
  );
  const hackingEquipment = equipments.filter((equipment) =>
    hackingTypeEquipments.includes(equipment.type)
  );

  while (true) {
    const gangMembers = ns.gang.getMemberNames();
    const fullCrew = gangMembers.length >= 12;

    if (gangInfo.territory >= 1) {
      if (gangInfo.territoryWarfareEngaged) {
        ns.gang.setTerritoryWarfare(false);
      }
    } else {
      if (fullCrew) {
        const otherGangsInfo = ns.gang.getOtherGangInformation();
        const winChances = Object.keys(otherGangsInfo).reduce(
          (allChances: number[], gangName) => {
            if (
              otherGangsInfo[gangName].territory &&
              gangName !== gangInfo.faction
            ) {
              return [
                ...allChances,
                Math.floor(ns.gang.getChanceToWinClash(gangName) * 100),
              ];
            }
            return allChances;
          },
          []
        );
        if (winChances.filter((winChance) => winChance <= 50).length >= 2) {
          ns.gang.setTerritoryWarfare(true);
        }
      }
    }

    const prefferedTask =
      (gangInfo.territoryWarfareEngaged && fullCrew) ||
      (fullCrew && gangInfo.territory < 1)
        ? territoryWarfareTask
        : tasks.sort((a: GangTaskStats, b: GangTaskStats) => {
            if (preferredTaskType === "money" || fullCrew) {
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
        ((!gangInfo.isHacking && ascResult.str >= 1.25) ||
          (gangInfo.isHacking && ascResult.hack >= 1.25))
      ) {
        ns.gang.ascendMember(member);
      }

      if (
        (!gangInfo.isHacking && memberInfo.str <= levelThreshold) ||
        (gangInfo.isHacking && memberInfo.hack <= levelThreshold)
      ) {
        ns.gang.setMemberTask(
          member,
          !gangInfo.isHacking ? "Train Combat" : "Train Hacking"
        );
      } else {
        ns.gang.setMemberTask(member, prefferedTask.name);
      }

      if (
        (memberInfo.augmentations.length != augmentationEquipment.length &&
          !gangInfo.territoryWarfareEngaged) ||
        (gangInfo.territoryWarfareEngaged &&
          !gangInfo.isHacking &&
          memberInfo.upgrades.length >= combatEquipment.length) ||
        (gangInfo.isHacking &&
          memberInfo.upgrades.length >= hackingEquipment.length)
      ) {
        const missingAugmentation = augmentationEquipment.filter(
          (augmentationEquipment) =>
            !memberInfo.augmentations.includes(augmentationEquipment.name)
        );
        buyAvaibleEquipment(ns, memberInfo, missingAugmentation);
      } else {
        if (!gangInfo.isHacking) {
          const missingEquipment = combatEquipment.filter(
            (equipment) => !memberInfo.upgrades.includes(equipment.name)
          );

          buyAvaibleEquipment(ns, memberInfo, missingEquipment);
        } else {
          const missingEquipment = hackingEquipment.filter(
            (equipment) => !memberInfo.upgrades.includes(equipment.name)
          );

          buyAvaibleEquipment(ns, memberInfo, missingEquipment);
        }
      }
    });

    await ns.sleep(config.timeouts.long);
  }
}
