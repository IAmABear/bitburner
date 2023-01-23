import { Player, Server } from "/../NetscriptDefinitions";
import getServers from "/utils/getServers";

type ThreadsNeeded = {
  hackThreads: number;
  weakenThreads: number;
  growThreads: number;
  totalThreads: number;
};

const targetMoneyPercentage = 0.5;
const growThreadSecurityIncrease = 0.004;
const hackThreadSecurityIncrease = 0.002;
const weakenThreadsecurityDecrease = 0.05;

const threadOffset = 0.4;
const calculateGrowPercentageThreads = (
  ns: NS,
  playerInfo: Player,
  server: Server,
  targetPercentage = 1,
  threadsNeeded = 1
): number => {
  const percentage = ns.formulas.hacking.growPercent(
    {
      ...server,
      moneyAvailable: server.moneyMax * targetMoneyPercentage,
    },
    threadsNeeded,
    playerInfo
  );

  if (percentage === Infinity) {
    return 1;
  }

  if (percentage < targetPercentage) {
    try {
      return calculateGrowPercentageThreads(
        ns,
        playerInfo,
        server,
        targetPercentage,
        Math.ceil(threadsNeeded * 2)
      );
    } catch (_error) {
      return threadsNeeded + 1;
    }
  }

  if (percentage >= targetPercentage + threadOffset) {
    try {
      return calculateGrowPercentageThreads(
        ns,
        playerInfo,
        server,
        targetPercentage,
        Math.ceil(threadsNeeded * 0.75)
      );
    } catch (_error) {
      return threadsNeeded + 1;
    }
  }

  return Math.ceil(threadsNeeded);
};

export async function main(ns: NS): Promise<void> {
  if (!ns.fileExists("Formulas.exe")) {
    ns.tprint("Formulas.exe required for this script");
    return;
  }

  const servers = await getServers(ns, {
    includeGhost: false,
    includeHome: false,
    mustHaveRootAccess: true,
    onlyGhost: false,
  });
  const serversWithMoney = servers.reduce(
    (allServers: Server[], currentServer) => {
      const serverInfo = ns.getServer(currentServer);

      if (serverInfo.moneyMax > 0) {
        return [...allServers, serverInfo];
      }

      return allServers;
    },
    []
  );

  const playerInfo = ns.getPlayer();

  const results = serversWithMoney.reduce(
    (allResults: { [x: string]: ThreadsNeeded }, currentServer) => {
      const hackThreadPercentage = ns.formulas.hacking.hackPercent(
        {
          ...currentServer,
          moneyAvailable: currentServer.moneyMax,
          hackDifficulty: currentServer.minDifficulty,
        },
        playerInfo
      );
      const hackThreads = Math.floor(
        targetMoneyPercentage / hackThreadPercentage
      );

      const neededToGrow =
        currentServer.moneyMax /
        (currentServer.moneyMax * targetMoneyPercentage);
      const growThreads = calculateGrowPercentageThreads(
        ns,
        playerInfo,
        {
          ...currentServer,
          moneyAvailable: currentServer.moneyMax * targetMoneyPercentage,
          hackDifficulty: currentServer.minDifficulty,
        },
        neededToGrow
      );

      const weakenThreads = Math.ceil(
        (hackThreads * hackThreadSecurityIncrease +
          growThreads * growThreadSecurityIncrease) /
          weakenThreadsecurityDecrease
      );

      return {
        ...allResults,
        ...{
          [currentServer.hostname.toString()]: {
            hackThreads,
            growThreads,
            weakenThreads,
            totalThreads: hackThreads + growThreads + weakenThreads,
          },
        },
      };
    },
    {}
  );

  ns.write(
    "optimalThreads.js",
    JSON.stringify(`export default ${JSON.stringify(results)}`),
    "w"
  );
}
