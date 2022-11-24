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
  timeScriptsDone: number;
  script: string;
  threads: number;
};

let events: BatchEvent[] = [];

type ServerThreadsInUse = {
  server: string;
  hack: number;
  weaken: number;
  grow: number;
};
const serverThreadsWatchdog: ServerThreadsInUse[] = [];

const getThreadServer = (server: string): ServerThreadsInUse => {
  const currentServerThread = serverThreadsWatchdog.find(
    (currentServer) => currentServer.server === server
  );

  return currentServerThread
    ? currentServerThread
    : {
        server: server,
        hack: 0,
        grow: 0,
        weaken: 0,
      };
};

const updateServerThread = (serverThread: ServerThreadsInUse) => {
  const currentServerThreadIndex = serverThreadsWatchdog.findIndex(
    (currentServer) => currentServer.server === serverThread.server
  );

  if (currentServerThreadIndex >= 0) {
    serverThreadsWatchdog[currentServerThreadIndex] = {
      ...serverThreadsWatchdog[currentServerThreadIndex],
      ...serverThread,
    };
  } else {
    serverThreadsWatchdog.push(serverThread);
  }
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

const prepServer = async (ns: NS, servers: string[]) => {
  const targetServer = batchableServers.find(
    (server) => server.prepped === false
  );
  if (!targetServer) {
    return;
  }

  return weakenServer(ns, targetServer.name, servers, 0);
};

const weakenServer = async (
  ns: NS,
  targetServer: string,
  servers: string[],
  timeBeforeScriptCanRun: number,
  eventType: BatchStatus = "prepped"
) => {
  const threadsNeeded = threadsNeededToWeaken(ns, targetServer);
  const serverWeakenTime = ns.getWeakenTime(targetServer);

  return runScript(
    ns,
    targetServer,
    servers,
    weakenScriptPath,
    threadsNeeded,
    timeBeforeScriptCanRun,
    {
      status: eventType,
      scriptCompletionTime: serverWeakenTime,
    }
  );
};

const growServer = async (
  ns: NS,
  targetServer: string,
  servers: string[],
  timeBeforeScriptCanRun: number
) => {
  ns.tprint(`Growin server ${targetServer}`);

  const threadsNeeded = threadsNeededToGrow(ns, targetServer);
  const growthTime = ns.getGrowTime(targetServer);

  return runScript(
    ns,
    targetServer,
    servers,
    growScriptPath,
    threadsNeeded,
    timeBeforeScriptCanRun,
    {
      status: "fullyGrown",
      scriptCompletionTime: growthTime,
    }
  );
};

const threadsNeededToHack = (ns: NS, targetServer: string) => {
  const targetMoneyHeist = ns.getServerMaxMoney(targetServer) * 0.3;

  return ns.hackAnalyzeThreads(targetServer, targetMoneyHeist);
};

const hackServer = async (
  ns: NS,
  targetServer: string,
  servers: string[],
  timeBeforeScriptCanRun: number
) => {
  ns.tprint("Hacking server");

  const threadsNeeded = threadsNeededToHack(ns, targetServer);
  const hackTime = ns.getHackTime(targetServer);

  return runScript(
    ns,
    targetServer,
    servers,
    hackScriptPath,
    threadsNeeded,
    timeBeforeScriptCanRun,
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
  if (threadsNeeded === 0) {
    events.push({
      server: targetServer,
      status: onSuccessEvent.status,
      timeScriptsDone: Date.now() + onSuccessEvent.scriptCompletionTime,
      script: scriptPath,
      threads: 0,
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
        scriptsActive += threadCount;

        if (scriptsActive >= threadsNeeded) {
          const serverThreadServer = getThreadServer(currentServer);
          updateServerThread({
            server: currentServer,
            hack:
              serverThreadServer.hack +
              (scriptPath === hackScriptPath ? scriptsActive : 0),
            grow:
              serverThreadServer.grow +
              (scriptPath === growScriptPath ? scriptsActive : 0),
            weaken:
              serverThreadServer.weaken +
              (scriptPath === weakenScriptPath ? scriptsActive : 0),
          });

          setTimeout(() => {
            ns.exec(scriptPath, currentServer, threadCount, targetServer);

            events.push({
              server: targetServer,
              status: onSuccessEvent.status,
              timeScriptsDone: Date.now() + onSuccessEvent.scriptCompletionTime,
              script: scriptPath,
              threads: scriptsActive,
            });
          }, timeBeforeScriptCanRun + short);
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

      setTimeout(() => {
        const serverThreadServer = getThreadServer(event.server);
        updateServerThread({
          server: event.server,
          hack:
            serverThreadServer.hack -
            (event.script === hackScriptPath ? event.threads : 0),
          grow:
            serverThreadServer.grow -
            (event.script === growScriptPath ? event.threads : 0),
          weaken:
            serverThreadServer.weaken -
            (event.script === weakenScriptPath ? event.threads : 0),
        });
      }, Date.now() - event.timeScriptsDone + short);

      ns.tprint(serverThreadsWatchdog);
      switch (event.status) {
        case "hackable":
          await hackServer(
            ns,
            batchableServers[0].name,
            servers,
            event.timeScriptsDone
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
        case "fullyGrown":
        case "fullyHacked":
          await weakenServer(
            ns,
            batchableServers[0].name,
            servers,
            event.timeScriptsDone,
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

    await ns.sleep(medium);
  }
}
