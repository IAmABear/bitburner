import getServers from "/scripts/utils/getServers.js";

const growScriptPath = "/scripts/hacks/grow.js";
const weakenScriptPath = "/scripts/hacks/weaken.js";
const hackScriptPath = "/scripts/hacks/hack.js";

type BatchableServer = {
  name: string;
  prepped: boolean;
};

const batchableServers: BatchableServer[] = [
  { name: "foodnstuff", prepped: false },
  { name: "n00dles", prepped: false },
  { name: "sigma-cosmetics", prepped: false },
];

type BatchEvent = {
  server: string;
  status: "hackable" | "prepped" | "fullyGrown" | "fullyHacked";
  timeScriptsDone: string;
};

let events: BatchEvent[] = [];

const prepServer = async (ns: NS, servers: string[]) => {
  const targetServer = batchableServers.find(
    (server) => server.prepped === false
  );

  if (!targetServer) {
    return;
  }

  const serverMinSecurity = ns.getServerMinSecurityLevel(targetServer.name);
  const serverSecurity = ns.getServerSecurityLevel(targetServer.name);
  const secDiff = serverSecurity - serverMinSecurity;
  const weakenEffect = ns.weakenAnalyze(1);
  const weakenThreadsNeeded = Math.ceil(secDiff / weakenEffect);

  let weakenScriptsActive = 0;

  const serverWeakenTime = ns.getWeakenTime(targetServer.name);

  await servers.forEach(async (currentServer) => {
    const neededThreads = weakenThreadsNeeded - weakenScriptsActive;
    const serverMaxRam = ns.getServerMaxRam(currentServer);
    const serverUsedRam = ns.getServerUsedRam(currentServer);
    const scriptRAM = ns.getScriptRam(weakenScriptPath, currentServer);
    const possibleThreadCount = Math.ceil(
      Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
    );
    const threadCount =
      weakenScriptsActive + possibleThreadCount >= neededThreads
        ? neededThreads - weakenScriptsActive
        : possibleThreadCount;

    if (threadCount >= 0) {
      if (!ns.scriptRunning(weakenScriptPath, targetServer.name)) {
        ns.exec(
          weakenScriptPath,
          currentServer,
          threadCount,
          targetServer.name
        );
        weakenScriptsActive += threadCount;

        if (weakenScriptsActive === weakenThreadsNeeded) {
          events.push({
            server: targetServer.name,
            status: "prepped",
            timeScriptsDone: Date.now() + serverWeakenTime,
          });

          const batchableServer = batchableServers.find(
            (server) => server.name === targetServer.name
          );
          if (batchableServer) {
            batchableServer.prepped = true;
            return await prepServer(ns, servers);
          }
        }
      }
    } else {
      targetServer.prepped = true;
      events.push({ server: targetServer.name, status: "prepped" });
    }
  });
};

const weakenServer = async (
  ns: NS,
  server: string,
  servers: string[],
  eventType: "hackable" | "prepped" | "fullyGrown" | "fullyHacked" = "prepped"
) => {
  const serverMinSecurity = ns.getServerMinSecurityLevel(server);
  const serverSecurity = ns.getServerSecurityLevel(server);
  const secDiff = serverSecurity - serverMinSecurity;
  const weakenEffect = ns.weakenAnalyze(1);
  const weakenThreadsNeeded = Math.ceil(secDiff / weakenEffect);

  let weakenScriptsActive = 0;

  const serverWeakenTime = ns.getWeakenTime(server);

  await servers.forEach(async (currentServer) => {
    const neededThreads = weakenThreadsNeeded - weakenScriptsActive;
    const serverMaxRam = ns.getServerMaxRam(currentServer);
    const serverUsedRam = ns.getServerUsedRam(currentServer);
    const scriptRAM = ns.getScriptRam(weakenScriptPath, currentServer);
    const possibleThreadCount = Math.ceil(
      Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
    );
    const threadCount =
      weakenScriptsActive + possibleThreadCount >= neededThreads
        ? neededThreads - weakenScriptsActive
        : possibleThreadCount;

    if (threadCount >= 0) {
      if (!ns.scriptRunning(weakenScriptPath, server)) {
        ns.exec(weakenScriptPath, currentServer, threadCount, server);
        weakenScriptsActive += threadCount;

        if (weakenScriptsActive === weakenThreadsNeeded) {
          events.push({
            server,
            status: eventType,
            timeScriptsDone: Date.now() + serverWeakenTime,
          });
        }
      }
    } else {
      ns.tprint("All weaken scripts needed triggered");

      events.push({ server, status: eventType });
    }
  });
};

const growServer = async (ns: NS, targetServer: string, servers: string[]) => {
  ns.tprint(`Growin server ${targetServer}`);
  const currentMoney = ns.getServerMoneyAvailable(targetServer);
  const maxMoney = ns.getServerMaxMoney(targetServer);
  const moneyDiff = (maxMoney - currentMoney) / currentMoney;
  const threadsNeeded =
    moneyDiff <= 1 ? 0 : Math.ceil(ns.growthAnalyze(targetServer, moneyDiff));
  if (threadsNeeded < 1) {
    events.push({ server: targetServer, status: "fullyGrown" });
    return;
  }

  let growthScriptsActive = 0;
  const growthTime = ns.getGrowTime(targetServer);

  await servers.forEach(async (currentServer) => {
    const serverMaxRam = ns.getServerMaxRam(currentServer);
    const serverUsedRam = ns.getServerUsedRam(currentServer);
    const scriptRAM = ns.getScriptRam(growScriptPath, currentServer);
    const possibleThreadCount = Math.ceil(
      Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
    );

    const threadCount =
      growthScriptsActive + possibleThreadCount >= threadsNeeded
        ? threadsNeeded - growthScriptsActive
        : possibleThreadCount;

    if (threadCount !== 0) {
      if (!ns.scriptRunning(growScriptPath, currentServer)) {
        ns.exec(growScriptPath, currentServer, threadCount, targetServer);
        growthScriptsActive += threadCount;

        if (growthScriptsActive >= threadsNeeded) {
          ns.tprint("All growth scripts needed triggered");

          events.push({
            server: targetServer,
            status: "fullyGrown",
            timeScriptsDone: Date.now() + growthTime,
          });
        }
      }
    }
  });
};

const hackServer = async (ns: NS, server: string, servers: string[]) => {
  ns.tprint("Hacking server");
  const targetMoneyHeist = ns.getServerMaxMoney(server) * 0.3;
  const threadsNeeded = ns.hackAnalyzeThreads(server, targetMoneyHeist);
  const hackTime = ns.getHackTime(server);
  let hackScriptsActive = 0;

  await servers.forEach(async (currentServer) => {
    const serverMaxRam = ns.getServerMaxRam(currentServer);
    const serverUsedRam = ns.getServerUsedRam(currentServer);
    const scriptRAM = ns.getScriptRam(hackScriptPath, currentServer);
    const possibleThreadCount = Math.ceil(
      Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
    );

    const threadCount =
      hackScriptsActive + possibleThreadCount >= threadsNeeded
        ? threadsNeeded - hackScriptsActive
        : possibleThreadCount;

    if (threadCount >= 0) {
      if (!ns.scriptRunning(hackScriptPath, currentServer)) {
        ns.exec(hackScriptPath, currentServer, threadCount, server);
        hackScriptsActive += threadCount;

        if (hackScriptsActive >= threadsNeeded) {
          events.push({
            server: server,
            status: "fullyHacked",
            timeScriptsDone: Date.now() + hackTime,
          });
        }
      }
    }
  });
};

/**
 * Batch hack a server enabling maximum profits.
 *
 * The initial implementation will focus on maximizing profits from a single
 * source of income. This is due to our current limitation in ram which will be
 * needed.
 *
 * A single batch consists of four actions:
 * - A hack script removes a predefined, precalculated amount of money from the
 *   target server.
 * - A weaken script counters the security increase of the hack script.
 * - A grow script counters the money decrease caused by the hack script.
 * - A weaken script counters the security increase caused by the grow script.
 *
 * Later versions will enable multiple source of income points to be hacked
 * (and maybe even calculate how many it can handle itself and scale accordingly).
 *
 * @param ns The bitburner NS scope
 */
export async function main(ns: NS): Promise<void> {
  const servers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
    onlyGhost: true,
  });

  await prepServer(ns, servers);
  /**
   * Before batches can be run a server should always be at minimum security
   * level to simplify this process
   *
   * Steps:
   * - Grow server to max money
   * - Weaken server till minimum security
   * - Hack for max profit
   * - Weaken server till minimum security
   */

  while (true) {
    ns.print(events);
    for (let index = 0; index < events.length; index++) {
      const event = events[index];

      switch (event.status) {
        case "hackable":
          await hackServer(ns, batchableServers[0].name, servers);
          break;
        case "prepped":
          await growServer(ns, batchableServers[0].name, servers);
          break;
        case "fullyGrown":
        case "fullyHacked":
          await weakenServer(
            ns,
            batchableServers[0].name,
            servers,
            event.status === "fullyGrown" ? "hackable" : "prepped"
          );
          break;
        default:
          await prepServer(ns, servers);
          break;
      }

      index++;
    }

    events = [];

    await ns.sleep(3000);
  }
}
