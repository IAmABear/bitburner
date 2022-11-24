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
import getPossibleThreadCount from "/scripts/utils/getPossibleThreadCount";
import threadsNeededToWeaken from "/scripts/utils/threadsNeededToWeaken";
import threadsNeededToGrow from "/scripts/utils/threadsNeededToGrow";
import { medium, long, short } from "/scripts/utils/timeoutTimes";

type BatchableServer = {
  name: string;
  prepped: boolean;
};

const batchableServers: BatchableServer[] = [
  { name: "foodnstuff", prepped: false },
  // { name: "n00dles", prepped: false },
  // { name: "sigma-cosmetics", prepped: false },
];

type BatchStatus =
  | "hackable"
  | "prepped"
  | "fullyGrown"
  | "fullyHacked"
  | "needsGrowing";
type BatchEvent = {
  id: number;
  server: string;
  status: BatchStatus;
  timeScriptsDone: number;
  script: string;
  threads: number;
};

let events: BatchEvent[] = [];
let scriptsActive = 0;
type ServerThreadsInUse = {
  server: string;
  hack: number;
  weaken: number;
  grow: number;
};

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

const prepServer = (ns: NS, servers: string[]) => {
  const targetServer =
    batchableServers.find((server) => server.prepped === false) ||
    batchableServers[0];

  return weakenServer(ns, targetServer.name, servers, 0);
};

const weakenServer = (
  ns: NS,
  targetServer: string,
  servers: string[],
  previousScriptDone: number,
  eventType: BatchStatus = "prepped",
  eventThreads = 0
) => {
  ns.print(`Running weaken on ${targetServer}`);
  const predictedSecurity =
    eventType === "hackable"
      ? ns.growthAnalyzeSecurity(eventThreads, targetServer, 1)
      : ns.hackAnalyzeSecurity(eventThreads, targetServer);

  const threadsNeeded = threadsNeededToWeaken(
    ns,
    targetServer,
    predictedSecurity
  );
  const serverWeakenTime = Math.ceil(ns.getWeakenTime(targetServer));

  return runScript(
    ns,
    targetServer,
    servers,
    weakenScriptPath,
    threadsNeeded,
    previousScriptDone - Date.now() - serverWeakenTime + short,
    {
      status: eventType,
      scriptCompletionTime: serverWeakenTime,
    }
  );
};

const growServer = (
  ns: NS,
  targetServer: string,
  servers: string[],
  previousScriptDone: number
) => {
  ns.print(`Growin server ${targetServer}`);

  const threadsNeeded = threadsNeededToGrow(ns, targetServer);
  const growthTime = Math.ceil(ns.getGrowTime(targetServer));

  return runScript(
    ns,
    targetServer,
    servers,
    growScriptPath,
    threadsNeeded,
    previousScriptDone - Date.now() - growthTime + short,
    {
      status: "fullyGrown",
      scriptCompletionTime: growthTime,
    }
  );
};

const threadsNeededToHack = (ns: NS, targetServer: string) => {
  const targetMoneyHeist = ns.getServerMaxMoney(targetServer) * 0.3;

  return Math.ceil(ns.hackAnalyzeThreads(targetServer, targetMoneyHeist));
};

const hackServer = (
  ns: NS,
  targetServer: string,
  servers: string[],
  previousScriptDone: number
) => {
  ns.print(`Hacking server: ${targetServer}`);

  const threadsNeeded = threadsNeededToHack(ns, targetServer);
  const hackTime = Math.ceil(ns.getHackTime(targetServer));

  return runScript(
    ns,
    targetServer,
    servers,
    hackScriptPath,
    threadsNeeded,
    previousScriptDone - Date.now() - hackTime + short,
    {
      status: "fullyHacked",
      scriptCompletionTime: hackTime,
    }
  );
};

const runScript = async (
  ns: NS,
  targetServer: string,
  servers: string[],
  scriptPath: string,
  threadsNeeded: number,
  timeBeforeScriptCanRun: number,
  onSuccessEvent: {
    status: BatchStatus;
    scriptCompletionTime: number;
  }
) => {
  // Fail-safe to avoid infinite triggers without actual results
  if (threadsNeeded <= 0) {
    ns.print("nothing needed");

    events.push({
      id: Math.random() + Date.now(),
      server: targetServer,
      status: onSuccessEvent.status,
      timeScriptsDone: Date.now(),
      script: scriptPath,
      threads: 0,
    });

    scriptsActive = 0;
    return ns.sleep(medium);
  }

  await ns.sleep(timeBeforeScriptCanRun > 0 ? timeBeforeScriptCanRun : short);

  for (let index = 0; index < servers.length; index++) {
    const currentServer = servers[index];

    if (scriptsActive !== threadsNeeded) {
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
          scriptsActive += threadCount;

          ns.exec(scriptPath, currentServer, threadCount, targetServer);
        }
      }

      if (scriptsActive >= threadsNeeded) {
        ns.print("active scripts reached");

        events.push({
          id: Math.random() + Date.now(),
          server: targetServer,
          status: onSuccessEvent.status,
          timeScriptsDone: Date.now() + onSuccessEvent.scriptCompletionTime,
          script: scriptPath,
          threads: scriptsActive,
        });

        scriptsActive = 0;

        break;
      }
    }
  }

  return ns.sleep(medium);
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
    if (events.length === 0) {
      await prepServer(ns, servers);
    } else {
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        switch (event.status) {
          case "hackable":
            await hackServer(
              ns,
              batchableServers[0].name,
              servers,
              event.timeScriptsDone - Date.now()
            );
            break;
          case "prepped": {
            const targetServer = batchableServers.find(
              (server) => server.name === event.server
            );
            if (targetServer) {
              targetServer.prepped = true;
            }

            await growServer(
              ns,
              batchableServers[0].name,
              servers,
              event.timeScriptsDone
            );
            break;
          }
          case "needsGrowing": {
            await growServer(
              ns,
              batchableServers[0].name,
              servers,
              event.timeScriptsDone
            );
            break;
          }
          case "fullyGrown":
          case "fullyHacked":
            await weakenServer(
              ns,
              batchableServers[0].name,
              servers,
              event.timeScriptsDone,
              event.status === "fullyGrown" ? "hackable" : "needsGrowing",
              event.threads
            );
            break;
          default:
            console.log("Unknown event given");
            break;
        }

        events = events.filter((currentEvent) => currentEvent.id !== event.id);

        index++;
      }
    }

    await ns.sleep(medium);
  }
}
