/**
 * Notes to self:
 *
 * - Need to handle which servers are going to be used since I can't use the
 *   bitburner API to see if a script is going to run since I'll be using
 *   setTimeout to delay triggering the scripts.
 * - Need to see if its needed to create a method to check if a server can
 *   handle the requests (grow and hack in particular) in one go to avoid
 *   requests failing due to security being to high since multiple requests
 *   might have finished before it.
 * - Need to check if servers arn't going to be flooded with multiple small
 *   requests (weaken, grow, hack) which avoid the server ever being able to
 *   handle larger requests (hack and grow in particular).
 * - Check if its worth the time to create a method to see how much ram is
 *   needed if we want to complete requests in one go and mark these servers
 *   so that we will always have some avaible.
 * - Need to check how far ahead we need to batch. Can we manage with just
 *   in time batching where we only ensure the next even to be scheduled or do
 *   we need to complete entire batches and queue the next one as well?
 * - Do we infinitly batch on server or do we split our threads among several
 *   servers?
 * - Check when its realistic to use batch scripting and make a script that
 *   switches between the current hub which forces it way through and the
 *   new batching script.
 */

import getServers from "/scripts/utils/getServers.js";
import {
  growScriptPath,
  weakenScriptPath,
  hackScriptPath,
} from "/scripts/utils/scriptPaths.js";

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

  return weakenServer(ns, targetServer.name, servers);
};

const weakenServer = async (
  ns: NS,
  targetServer: string,
  servers: string[],
  eventType: BatchStatus = "prepped"
) => {
  const threadsNeeded = threadsNeededToWeaken(ns, targetServer);
  const serverWeakenTime = ns.getWeakenTime(targetServer);

  return runScript(ns, targetServer, servers, weakenScriptPath, threadsNeeded, {
    status: eventType,
    scriptCompletionTime: serverWeakenTime,
  });
};

const threadsNeededToGrow = (ns: NS, targetServer: string) => {
  const currentMoney = ns.getServerMoneyAvailable(targetServer);
  const maxMoney = ns.getServerMaxMoney(targetServer);
  const moneyDiff = (maxMoney - currentMoney) / currentMoney;

  return moneyDiff <= 1
    ? 0
    : Math.ceil(ns.growthAnalyze(targetServer, moneyDiff));
};

const growServer = async (ns: NS, targetServer: string, servers: string[]) => {
  ns.tprint(`Growin server ${targetServer}`);

  const threadsNeeded = threadsNeededToGrow(ns, targetServer);
  const growthTime = ns.getGrowTime(targetServer);

  return runScript(ns, targetServer, servers, growScriptPath, threadsNeeded, {
    status: "fullyGrown",
    scriptCompletionTime: growthTime,
  });
};

const threadsNeededToHack = (ns: NS, targetServer: string) => {
  const targetMoneyHeist = ns.getServerMaxMoney(targetServer) * 0.3;

  return ns.hackAnalyzeThreads(targetServer, targetMoneyHeist);
};

const hackServer = async (ns: NS, targetServer: string, servers: string[]) => {
  ns.tprint("Hacking server");

  const threadsNeeded = threadsNeededToHack(ns, targetServer);
  const hackTime = ns.getHackTime(targetServer);

  return runScript(ns, targetServer, servers, hackScriptPath, threadsNeeded, {
    status: "fullyHacked",
    scriptCompletionTime: hackTime,
  });
};

const runScript = async (
  ns: NS,
  targetServer: string,
  servers: string[],
  scriptPath: string,
  threadsNeeded: number,
  onSuccessEvent: {
    status: BatchStatus;
    scriptCompletionTime: number;
  }
) => {
  // Fail-safe to avoid infinite triggers without actual results
  if (threadsNeeded === 0) {
    events.push({
      server: targetServer,
      status: onSuccessEvent.status,
      timeScriptsDone: Date.now() + onSuccessEvent.scriptCompletionTime,
    });
  }

  let scriptsActive = 0;

  await servers.forEach(async (currentServer) => {
    const possibleThreadCount = getPossibleThreadCount(
      ns,
      currentServer,
      scriptPath
    );
    const threadCount =
      scriptsActive + possibleThreadCount >= threadsNeeded
        ? threadsNeeded - scriptsActive
        : possibleThreadCount;

    if (threadCount >= 0) {
      if (!hasServerRunningsScripts(ns, currentServer)) {
        ns.exec(scriptPath, currentServer, threadCount, targetServer);
        scriptsActive += threadCount;

        if (scriptsActive >= threadsNeeded) {
          events.push({
            server: targetServer,
            status: onSuccessEvent.status,
            timeScriptsDone: Date.now() + onSuccessEvent.scriptCompletionTime,
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
        case "prepped": {
          const targetServer = batchableServers.find(
            (server) => server.name === event.server
          );
          if (targetServer) {
            targetServer.prepped = true;
          }

          await growServer(ns, batchableServers[0].name, servers);
          break;
        }
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
