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
import QueueManager from "/scripts/utils/queueManager";

let executionTimeHacking = 0;
let previousBatchResultsAbleToSupport = 1;

const batchableServers = async (ns: NS, queueManger: QueueManager) => {
  const allServers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
  });
  const serversInfo = allServers.map((server: string) => ns.getServer(server));
  const idealServers = serversInfo
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

  const withinHackingLevelRange =
    idealServers.length > 0
      ? idealServers
      : [
          serversInfo.find(
            (server: Server) => server.hostname === "n00dles"
          ) as Server,
        ];

  const ghostServers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
    onlyGhost: true,
  });
  const ghostServersInfo = ["home", ...ghostServers].map((server: string) =>
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

  const executionThreshold = medium + previousBatchResultsAbleToSupport * short;

  if (executionTimeHacking >= executionThreshold) {
    // Set new support
    const slicedSupport = Math.ceil(previousBatchResultsAbleToSupport / 2);
    previousBatchResultsAbleToSupport = slicedSupport;
    withinHackingLevelRange.length = slicedSupport;

    // Remove all events in the  queue with servers we no longer support
    const newServerNames = withinHackingLevelRange.map(
      (server) => server.hostname
    );

    queueManger.removeServersFromEvents(newServerNames);
  } else if (
    executionTimeHacking <= executionThreshold &&
    previousBatchResultsAbleToSupport <= serversAbleToSupport
  ) {
    const uppedSupport = Math.ceil(
      previousBatchResultsAbleToSupport + previousBatchResultsAbleToSupport / 2
    );

    previousBatchResultsAbleToSupport =
      uppedSupport <= serversAbleToSupport
        ? uppedSupport
        : serversAbleToSupport;
    withinHackingLevelRange.length = uppedSupport;
  } else if (withinHackingLevelRange.length >= serversAbleToSupport) {
    withinHackingLevelRange.length = serversAbleToSupport;
    previousBatchResultsAbleToSupport = serversAbleToSupport;
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

const calculateThreadsNeededToWeaken = (ns: NS, event: BatchEvent) => {
  const predictedSecurity =
    event.status === "hackable"
      ? ns.growthAnalyzeSecurity(event.threads, event.server, 1)
      : ns.hackAnalyzeSecurity(event.threads, event.server);

  return threadsNeededToWeaken(ns, event.server, predictedSecurity);
};

const weakenServer = (
  ns: NS,
  servers: string[],
  event: BatchEvent,
  queueManager: QueueManager
) => {
  ns.print(`Running weaken on ${event.server}`);

  const serverWeakenTime = Math.ceil(ns.getWeakenTime(event.server));

  return runScript(
    ns,
    servers,
    event,
    weakenScriptPath,
    calculateThreadsNeededToWeaken,
    event.timeScriptsDone - Date.now() + short,
    {
      status: event.status === "fullyGrown" ? "hackable" : "needsGrowing",
      scriptCompletionTime: serverWeakenTime,
    },
    queueManager
  );
};

const growServer = (
  ns: NS,
  servers: string[],
  event: BatchEvent,
  queueManager: QueueManager
) => {
  ns.print(`Growin server ${event.server}`);

  const growthTime = Math.ceil(ns.getGrowTime(event.server));

  return runScript(
    ns,
    servers,
    event,
    growScriptPath,
    threadsNeededToGrow,
    event.timeScriptsDone - Date.now() + short,
    {
      status: "fullyGrown",
      scriptCompletionTime: growthTime,
    },
    queueManager,
    0,
    true
  );
};

const threadsNeededToHack = (ns: NS, event: BatchEvent) => {
  const targetMoneyHeist = ns.getServerMaxMoney(event.server) * 0.3;

  return Math.ceil(ns.hackAnalyzeThreads(event.server, targetMoneyHeist));
};

const hackServer = (
  ns: NS,
  servers: string[],
  event: BatchEvent,
  queueManager: QueueManager
) => {
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
    },
    queueManager,
    0,
    true
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
  queueManager: QueueManager,
  overflowThreadsNeeded?: number,
  runOnOneMachine?: boolean,
  retry = 0
) => {
  if (timeBeforeScriptCanRun >= short) {
    return await ns.sleep(skip);
  }

  await ns.sleep(timeBeforeScriptCanRun >= 0 ? timeBeforeScriptCanRun : short);
  let scriptsActive = 0;
  const threadsNeeded = overflowThreadsNeeded
    ? overflowThreadsNeeded
    : getThreadsNeeded(ns, event);

  // Fail-safe to avoid infinite triggers without actual results
  if (threadsNeeded <= 0) {
    ns.print("nothing needed");

    queueManager.addEvent({
      id: Math.random() + Date.now(),
      server: event.server,
      status: onSuccessEvent.status,
      timeScriptsDone: Date.now(),
      script: scriptPath,
      threads: 0,
    });

    queueManager.removeEvent(event.id);

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

      if (
        threadCount > 0 &&
        (!runOnOneMachine ||
          (runOnOneMachine && possibleThreadCount >= threadsNeeded) ||
          (runOnOneMachine && retry >= 3))
      ) {
        scriptsActive += threadCount;

        ns.exec(
          scriptPath,
          currentServer,
          threadCount,
          event.server,
          (Math.random() + Date.now()).toString()
        );
      }

      if (scriptsActive >= threadsNeeded) {
        queueManager.addEvent({
          id: Math.random() + Date.now(),
          server: event.server,
          status: onSuccessEvent.status,
          timeScriptsDone: Date.now() + onSuccessEvent.scriptCompletionTime,
          script: scriptPath,
          threads: scriptsActive,
        });

        queueManager.removeEvent(event.id);

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
      queueManager,
      threadsNeeded - scriptsActive,
      runOnOneMachine,
      retry
    );
  }

  if (runOnOneMachine) {
    const eventStillActive = queueManager.isEventActive(event.id);

    if (eventStillActive) {
      await runScript(
        ns,
        servers,
        event,
        scriptPath,
        getThreadsNeeded,
        timeBeforeScriptCanRun,
        onSuccessEvent,
        queueManager,
        threadsNeeded - scriptsActive,
        runOnOneMachine,
        retry + 1
      );
    }
  }

  return ns.sleep(short);
};

let currentlyUsedBatchServers: string[] = [];

const updateBatchableServers = async (
  ns: NS,
  servers: string[],
  queueManager: QueueManager
) => {
  const serversToTrigger = await batchableServers(ns, queueManager);

  const newServers = serversToTrigger.filter(
    (server: string) => !currentlyUsedBatchServers.includes(server)
  );
  currentlyUsedBatchServers = serversToTrigger;

  for (let index = 0; index < newServers.length; index++) {
    const batchableServer = newServers[index];

    await weakenServer(
      ns,
      servers,
      {
        id: Math.random() + Date.now(),
        server: batchableServer,
        status: "needsGrowing",
        timeScriptsDone: 0,
        script: weakenScriptPath,
        threads: 0,
      },
      queueManager
    );
  }

  return ns.sleep(short);
};

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");
  const queueManager = new QueueManager();

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

    const events = queueManager.queue;
    const startHacking = performance.now();

    if (events.length === 0) {
      await updateBatchableServers(ns, servers, queueManager);
    } else {
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        switch (event.status) {
          case "hackable":
            await hackServer(ns, servers, event, queueManager);
            break;
          case "needsGrowing": {
            await growServer(ns, servers, event, queueManager);
            break;
          }
          case "fullyGrown":
          case "fullyHacked":
            await weakenServer(ns, servers, event, queueManager);
            break;
          default:
            console.log("Unknown event given");
            break;
        }

        index++;
      }
    }

    executionTimeHacking = performance.now() - startHacking;
    await updateBatchableServers(ns, servers, queueManager);

    await ns.sleep(short);
  }
}
