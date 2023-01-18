import { Server } from "/../NetscriptDefinitions";
import getServers from "/scripts/utils/getServers";

export default async (ns: NS, returnAmount = 1): Promise<Server[]> => {
  const playerInfo = ns.getPlayer();
  const allServers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
  });
  const serversWithInfo = allServers.map((server: string) =>
    ns.getServer(server)
  );
  const hackableServers = serversWithInfo
    .filter(
      (server: Server) =>
        server.moneyMax > 0 &&
        server.hasAdminRights &&
        server.requiredHackingSkill <= playerInfo.skills.hacking / 2
    )
    .sort(
      (serverA: Server, serverB: Server) =>
        serverB.moneyMax / serverB.minDifficulty -
        serverA.moneyMax / serverA.minDifficulty
    );

  hackableServers.length = returnAmount;

  return hackableServers;
};
