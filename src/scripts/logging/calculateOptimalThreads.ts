import { Player, Server } from "/../NetscriptDefinitions";
import getServers from "/scripts/utils/getServers";

type ThreadsNeeded = {
  hackThreads: number;
  weakenThreads: number;
  growThreads: number;
  totalThreads: number;
};

const targetMoneyPercentage = 0.5;
const growThreadSecurityIncrease = 0.004;
const hackThreadSecurityIncrease = 0.002;
const weakenThreadSecutiryDecrease = 0.05;

const threadOffset = 0.1;
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
    ns.tprint(
      `serverName: ${server.hostname} targetPercentage: ${targetPercentage}; percentage: ${percentage}; threadsNeeded: ${threadsNeeded}`
    );
    return 1;
  }

  if (percentage <= targetPercentage - threadOffset) {
    return calculateGrowPercentageThreads(
      ns,
      playerInfo,
      server,
      targetPercentage,
      threadsNeeded * 2
    );
  }

  if (percentage >= targetPercentage + threadOffset) {
    return calculateGrowPercentageThreads(
      ns,
      playerInfo,
      server,
      targetPercentage,
      threadsNeeded * 0.75
    );
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
    (allResults: { [x: string]: ThreadsNeeded }, currentServer, index) => {
      if (index >= 7) {
        return allResults;
      }
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
          weakenThreadSecutiryDecrease
      );

      return {
        ...allResults,
        ...{
          [currentServer.hostname]: {
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

  ns.write("optimal-threads.js", JSON.stringify(results), "w");
}
