import getServers from "/scripts/utils/getServers.js";
import {
  growScriptPath,
  weakenScriptPath,
  hackScriptPath,
} from "/scripts/utils/scriptPaths.js";

export async function main(ns: NS): Promise<void> {
  const servers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
  });
  const results = [];

  for (let index = 0; index < servers.length; index++) {
    const server: string = servers[index];

    const maxMoney = ns.getServerMaxMoney(server);
    if (maxMoney !== 0) {
      const targetMoneyHeist = maxMoney * 0.3;
      const moneyPerHack = maxMoney * ns.hackAnalyze(server);

      const targetMoney = maxMoney * 0.7;
      const moneyDiff = 1 + (maxMoney - targetMoney) / targetMoney;
      const growthThreadsNeeded = Math.ceil(
        ns.growthAnalyze(server, moneyDiff)
      );

      const serverMinSecurity = ns.getServerMinSecurityLevel(server);
      const serverSecurity = ns.getServer(server).baseDifficulty;
      const secDiff = serverSecurity - serverMinSecurity;
      const weakenEffect = ns.weakenAnalyze(1);

      results.push({
        [server]: {
          // Hack is not really stable to read since we have no way to currently
          // know how much 1 hack actually does since it looks at the server.
          hack: Math.ceil(targetMoneyHeist / moneyPerHack),
          grow: growthThreadsNeeded,
          weaken: Math.ceil(secDiff / weakenEffect),
        },
      });
    }
  }

  ns.tprint(results);
}
