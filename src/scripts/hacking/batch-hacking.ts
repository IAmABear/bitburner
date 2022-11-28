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
import { long, medium, short, skip } from "/scripts/utils/timeoutTimes";
import { Server } from "/../NetscriptDefinitions";

const batchableServers = async (ns: NS) => {
  const allServers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
  });
  const serversInfo = allServers.map((server: string) => ns.getServer(server));
  const withinHackingLevelRange = serversInfo
    .filter((server: Server) => server.moneyMax !== 0 && server.hasAdminRights)
    .filter(
      (server: Server) =>
        server.requiredHackingSkill <= ns.getHackingLevel() / 3
    )
    .sort(
      (firstServer: Server, secondServer: Server) =>
        secondServer.moneyMax - firstServer.moneyMax &&
        secondServer.serverGrowth - firstServer.serverGrowth
    );

  const ghostServers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
    onlyGhost: true,
  });
  const ghostServersInfo = ghostServers.map((server: string) =>
    ns.getServer(server)
  );
  let avaibleRam: number = ghostServersInfo.reduce(
    (totalRam: number, server: Server) =>
      totalRam + ns.getServer(server.hostname).maxRam,
    0
  );
  const severWeakenEffect = 0.05;

  // For now we'll just check what is needed to weaken the secutiry twice its base
  const serversAbleToSupport =
    withinHackingLevelRange.reduce((serverAmount: number, server: Server) => {
      const threadsNeededForFullWeaken =
        (server.minDifficulty * 2) / severWeakenEffect;

      if (threadsNeededForFullWeaken <= avaibleRam) {
        avaibleRam = avaibleRam - threadsNeededForFullWeaken;
        return serverAmount + 1;
      }

      return serverAmount;
    }, 0) || 1;

  if (withinHackingLevelRange.length >= serversAbleToSupport) {
    withinHackingLevelRange.length = serversAbleToSupport;
  }

  return withinHackingLevelRange.map((server: Server) => server.hostname);
};

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

const calculateThreadsNeededToWeaken = (ns: NS, event: BatchEvent) => {
  const predictedSecurity =
    event.status === "hackable"
      ? ns.growthAnalyzeSecurity(event.threads, event.server, 1)
      : ns.hackAnalyzeSecurity(event.threads, event.server);

  return threadsNeededToWeaken(ns, event.server, predictedSecurity);
};

const weakenServer = (ns: NS, servers: string[], event: BatchEvent) => {
  ns.print(`Running weaken on ${event.server}`);

  const serverWeakenTime = Math.ceil(ns.getWeakenTime(event.server));

  return runScript(
    ns,
    servers,
    event,
    weakenScriptPath,
    calculateThreadsNeededToWeaken,
    // event.timeScriptsDone - Date.now() - serverWeakenTime + short,
    event.timeScriptsDone - Date.now() + short,
    {
      status: event.status === "fullyGrown" ? "hackable" : "needsGrowing",
      scriptCompletionTime: serverWeakenTime,
    }
  );
};

const growServer = (ns: NS, servers: string[], event: BatchEvent) => {
  ns.print(`Growin server ${event.server}`);

  const growthTime = Math.ceil(ns.getGrowTime(event.server));

  return runScript(
    ns,
    servers,
    event,
    growScriptPath,
    threadsNeededToGrow,
    // event.timeScriptsDone - Date.now() - growthTime + short,
    event.timeScriptsDone - Date.now() + short,
    {
      status: "fullyGrown",
      scriptCompletionTime: growthTime,
    }
  );
};

const threadsNeededToHack = (ns: NS, event: BatchEvent) => {
  const targetMoneyHeist = ns.getServerMaxMoney(event.server) * 0.3;

  return Math.ceil(ns.hackAnalyzeThreads(event.server, targetMoneyHeist));
};

const hackServer = (ns: NS, servers: string[], event: BatchEvent) => {
  ns.print(`Hacking server: ${event.server}`);

  const hackTime = Math.ceil(ns.getHackTime(event.server));

  return runScript(
    ns,
    servers,
    event,
    hackScriptPath,
    threadsNeededToHack,
    event.timeScriptsDone - Date.now() - hackTime + short,
    {
      status: "fullyHacked",
      scriptCompletionTime: hackTime,
    }
  );
};

const runScript = async (
  ns: NS,
  servers: string[],
  event: BatchEvent,
  scriptPath: string,
  getThreadsNeeded: (ns: NS, event: BatchEvent) => number,
  timeBeforeScriptCanRun: number,
  onSuccessEvent: {
    status: BatchStatus;
    scriptCompletionTime: number;
  },
  overflowThreadsNeeded?: number
) => {
  if (timeBeforeScriptCanRun >= short) {
    return await ns.sleep(skip);
  }

  await ns.sleep(timeBeforeScriptCanRun > 0 ? timeBeforeScriptCanRun : short);

  const threadsNeeded = overflowThreadsNeeded || getThreadsNeeded(ns, event);

  // Fail-safe to avoid infinite triggers without actual results
  if (threadsNeeded <= 0) {
    ns.print("nothing needed");

    events.push({
      id: Math.random() + Date.now(),
      server: event.server,
      status: onSuccessEvent.status,
      timeScriptsDone: Date.now(),
      script: scriptPath,
      threads: 0,
    });

    scriptsActive = 0;
    return ns.sleep(skip);
  }

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

          ns.exec(scriptPath, currentServer, threadCount, event.server);
        }
      }

      if (scriptsActive >= threadsNeeded) {
        ns.print("active scripts reached");

        events.push({
          id: Math.random() + Date.now(),
          server: event.server,
          status: onSuccessEvent.status,
          timeScriptsDone: Date.now() + onSuccessEvent.scriptCompletionTime,
          script: scriptPath,
          threads: scriptsActive,
        });

        events = events.filter((currentEvent) => currentEvent.id !== event.id);
        scriptsActive = 0;

        break;
      }
    }
  }

  if (scriptsActive !== 0) {
    await ns.sleep(long);

    await runScript(
      ns,
      servers,
      event,
      scriptPath,
      getThreadsNeeded,
      timeBeforeScriptCanRun,
      onSuccessEvent,
      threadsNeeded
    );
  }

  return ns.sleep(short);
};

let currentlyUsedBatchServers: string[] = [];

const updateBatchableServers = async (ns: NS, servers: string[]) => {
  const serversToTrigger = await batchableServers(ns);
  const newServers = currentlyUsedBatchServers.filter(
    (server: string) => !serversToTrigger.includes(server)
  );

  for (let index = 0; index < newServers.length; index++) {
    const batchableServer = newServers[index];

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

const triggerAllServers = async (ns: NS, servers: string[]) => {
  const serversToTrigger = await batchableServers(ns);
  currentlyUsedBatchServers = serversToTrigger;
  for (let index = 0; index < serversToTrigger.length; index++) {
    const batchableServer = serversToTrigger[index];

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
  ns.disableLog("ALL");
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
    let servers = await getServers(ns, {
      includeHome: false,
      includeGhost: false,
      onlyGhost: true,
    });
    if ((ns.args[0] as string) === "home" || (ns.args[0] as string) === "all") {
      servers.push("home");
    }

    if ((ns.args[0] as string) === "all") {
      const normalServers = await getServers(ns, {
        includeHome: false,
        includeGhost: false,
      });

      servers = [...servers, ...normalServers];
    }

    if (events.length === 0) {
      await triggerAllServers(ns, servers);
    } else {
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        switch (event.status) {
          case "hackable":
            await hackServer(ns, servers, event);
            break;
          case "needsGrowing": {
            await growServer(ns, servers, event);
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

        index++;
      }
    }

    await updateBatchableServers(ns, servers);

    await ns.sleep(short);
  }
}
