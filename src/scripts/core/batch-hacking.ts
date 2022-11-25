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
import { medium, short } from "/scripts/utils/timeoutTimes";

const batchableServers: string[] = ["foodnstuff"];

type BatchStatus = "hackable" | "fullyGrown" | "fullyHacked" | "needsGrowing";
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

const weakenServer = (ns: NS, servers: string[], event: BatchEvent) => {
  ns.print(`Running weaken on ${event.server}`);
  const predictedSecurity =
    event.status === "hackable"
      ? ns.growthAnalyzeSecurity(event.threads, event.server, 1)
      : ns.hackAnalyzeSecurity(event.threads, event.server);

  const threadsNeeded = threadsNeededToWeaken(
    ns,
    event.server,
    predictedSecurity
  );
  const serverWeakenTime = Math.ceil(ns.getWeakenTime(event.server));

  return runScript(
    ns,
    event.server,
    servers,
    weakenScriptPath,
    threadsNeeded,
    event.timeScriptsDone - Date.now() - serverWeakenTime + short,
    {
      status: event.status === "fullyGrown" ? "hackable" : "needsGrowing",
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
    return ns.sleep(short);
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

      if (threadCount > 0) {
        if (!ns.scriptRunning(scriptPath, currentServer)) {
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

const triggerAllServers = async (ns: NS, servers: string[]) => {
  for (let index = 0; index < batchableServers.length; index++) {
    const batchableServer = batchableServers[index];

    await weakenServer(ns, servers, {
      id: Math.random() + Date.now(),
      server: batchableServer,
      status: "needsGrowing",
      timeScriptsDone: 0,
      script: weakenScriptPath,
      threads: 0,
    });
  }

  return ns.sleep(short);
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
    const servers = await getServers(ns, {
      includeHome: false,
      includeGhost: false,
      onlyGhost: true,
    });

    if (events.length === 0) {
      await triggerAllServers(ns, servers);
    } else {
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        switch (event.status) {
          case "hackable":
            await hackServer(
              ns,
              event.server,
              servers,
              event.timeScriptsDone - Date.now()
            );
            break;
          case "needsGrowing": {
            await growServer(ns, event.server, servers, event.timeScriptsDone);
            break;
          }
          case "fullyGrown":
          case "fullyHacked":
            await weakenServer(ns, servers, event);
            break;
          default:
            console.log("Unknown event given");
            break;
        }

        events = events.filter((currentEvent) => currentEvent.id !== event.id);

        index++;
      }
    }

    await ns.sleep(short);
  }
}
