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

type BatchStatus = "hackable" | "prepped" | "fullyGrown" | "fullyHacked";
type BatchEvent = {
  server: string;
  status: BatchStatus;
  timeScriptsDone?: number;
};

let events: BatchEvent[] = [];

/**
 * Temporary fix to ensure no duplicate scripts are running and servers only run
 * on script at the time. This will be fixed later with better betection but for
 * now it will suffice.
 *
 * @param server The server name to check
 * @returns boolean is the server has a script running already
 */
const hasServerRunningsScripts = (ns: NS, server: string) => {
  return (
    ns.scriptRunning(growScriptPath, server) ||
    ns.scriptRunning(weakenScriptPath, server) ||
    ns.scriptRunning(hackScriptPath, server)
  );
};

const getPossibleThreadCount = (ns: NS, server: string, script: string) => {
  const serverMaxRam = ns.getServerMaxRam(server);
  const serverUsedRam = ns.getServerUsedRam(server);
  const scriptRAM = ns.getScriptRam(script, server);

  return Math.ceil(Math.floor((serverMaxRam - serverUsedRam) / scriptRAM));
};

const threadsNeededToWeaken = (ns: NS, server: string) => {
  const serverMinSecurity = ns.getServerMinSecurityLevel(server);
  const serverSecurity = ns.getServerSecurityLevel(server);
  const secDiff = serverSecurity - serverMinSecurity;
  const weakenEffect = ns.weakenAnalyze(1);

  return Math.ceil(secDiff / weakenEffect);
};

const prepServer = async (ns: NS, servers: string[]) => {
  const targetServer = batchableServers.find(
    (server) => server.prepped === false
  );

  if (!targetServer) {
    return;
  }

  const weakenThreadsNeeded = threadsNeededToWeaken(ns, targetServer.name);

  let weakenScriptsActive = 0;

  await servers.forEach(async (currentServer) => {
    const neededThreads = weakenThreadsNeeded - weakenScriptsActive;
    const possibleThreadCount = getPossibleThreadCount(
      ns,
      currentServer,
      weakenScriptPath
    );
    const threadCount =
      weakenScriptsActive + possibleThreadCount >= neededThreads
        ? neededThreads - weakenScriptsActive
        : possibleThreadCount;

    if (threadCount >= 0) {
      if (!hasServerRunningsScripts(ns, targetServer.name)) {
        ns.exec(
          weakenScriptPath,
          currentServer,
          threadCount,
          targetServer.name
        );
        weakenScriptsActive += threadCount;

        if (weakenScriptsActive === weakenThreadsNeeded) {
          const serverWeakenTime = ns.getWeakenTime(targetServer.name);

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
  eventType: BatchStatus = "prepped"
) => {
  const weakenThreadsNeeded = threadsNeededToWeaken(ns, server);

  let scriptsActive = 0;

  await servers.forEach(async (currentServer) => {
    const possibleThreadCount = getPossibleThreadCount(
      ns,
      currentServer,
      weakenScriptPath
    );
    const neededThreads = weakenThreadsNeeded - scriptsActive;
    const threadCount =
      scriptsActive + possibleThreadCount >= neededThreads
        ? neededThreads - scriptsActive
        : possibleThreadCount;

    if (threadCount >= 0) {
      if (!hasServerRunningsScripts(ns, server)) {
        ns.exec(weakenScriptPath, currentServer, threadCount, server);
        scriptsActive += threadCount;

        if (scriptsActive === weakenThreadsNeeded) {
          const serverWeakenTime = ns.getWeakenTime(server);
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

const threadsNeededToGrow = (ns: NS, server: string) => {
  const currentMoney = ns.getServerMoneyAvailable(server);
  const maxMoney = ns.getServerMaxMoney(server);
  const moneyDiff = (maxMoney - currentMoney) / currentMoney;

  return moneyDiff <= 1 ? 0 : Math.ceil(ns.growthAnalyze(server, moneyDiff));
};

const growServer = async (ns: NS, targetServer: string, servers: string[]) => {
  ns.tprint(`Growin server ${targetServer}`);
  const threadsNeeded = threadsNeededToGrow(ns, targetServer);
  if (threadsNeeded < 1) {
    events.push({ server: targetServer, status: "fullyGrown" });
    return;
  }

  let scriptsActive = 0;

  await servers.forEach(async (currentServer) => {
    const possibleThreadCount = getPossibleThreadCount(
      ns,
      currentServer,
      growScriptPath
    );

    const threadCount =
      scriptsActive + possibleThreadCount >= threadsNeeded
        ? threadsNeeded - scriptsActive
        : possibleThreadCount;

    if (threadCount !== 0) {
      if (!hasServerRunningsScripts(ns, targetServer)) {
        ns.exec(growScriptPath, currentServer, threadCount, targetServer);
        scriptsActive += threadCount;

        if (scriptsActive >= threadsNeeded) {
          ns.tprint("All growth scripts needed triggered");
          const growthTime = ns.getGrowTime(targetServer);
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

const threadsNeededToHack = (ns: NS, server: string) => {
  const targetMoneyHeist = ns.getServerMaxMoney(server) * 0.3;

  return ns.hackAnalyzeThreads(server, targetMoneyHeist);
};

const hackServer = async (ns: NS, server: string, servers: string[]) => {
  ns.tprint("Hacking server");
  const threadsNeeded = threadsNeededToHack(ns, server);

  let scriptsActive = 0;

  await servers.forEach(async (currentServer) => {
    const possibleThreadCount = getPossibleThreadCount(
      ns,
      currentServer,
      hackScriptPath
    );

    const threadCount =
      scriptsActive + possibleThreadCount >= threadsNeeded
        ? threadsNeeded - scriptsActive
        : possibleThreadCount;

    if (threadCount >= 0) {
      if (!ns.scriptRunning(hackScriptPath, currentServer)) {
        ns.exec(hackScriptPath, currentServer, threadCount, server);
        scriptsActive += threadCount;

        if (scriptsActive >= threadsNeeded) {
          const hackTime = ns.getHackTime(server);

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
          console.log("Unknown event given");
          break;
      }

      index++;
    }

    events = [];

    await ns.sleep(3000);
  }
}
