import optimalThreads from "/optimalThreads";
import getPossibleThreadCount from "/scripts/utils/getPossibleThreadCount";
import getServers from "/scripts/utils/getServers";
import QueueManger, { QueueEvent } from "/scripts/utils/queueManager";
import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import threadsNeededToGrow from "/scripts/utils/threadsNeededToGrow";
import threadsNeededToWeaken from "/scripts/utils/threadsNeededToWeaken";
import { short, skip } from "/scripts/utils/timeoutTimes";

type BatchStatus = "hackable" | "fullyGrown" | "fullyHacked" | "needsGrowing";

const batchableServers = ["joesguns"];
const growThreadSecurityIncrease = 0.004;
const weakenThreadSecutiryDecrease = 0.05;

const getWorkerServers = async (
  ns: NS,
  { includeHome = false, includeHackableServers = false }
) => {
  let servers = await getServers(ns, {
    includeHome: false,
    includeGhost: true,
    onlyGhost: true,
  });

  if (includeHome) {
    servers.push("home");
  }

  if (includeHackableServers) {
    const normalServers = await getServers(ns, {
      includeHome: false,
      includeGhost: false,
    });

    servers = [...servers, ...normalServers];
  }

  return servers;
};

const getThreads = (ns: NS, event: QueueEvent): number => {
  const serverThreads = optimalThreads[event.server];

  if (!serverThreads) {
    ns.tprint(`No optimal threads found for ${event.server}!`);
    return 0;
  }

  if (event.status === "hackable") {
    return optimalThreads[event.server].hackThreads;
  }

  if (event.status === "needsGrowing") {
    return optimalThreads[event.server].growThreads;
  }

  if (event.status === "fullyGrown" || event.status === "fullyHacked") {
    return optimalThreads[event.server].weakenThreads;
  }
  ns.tprint(`${event.status} returning 0?`);
  return 0;
};

const runScript = (
  ns: NS,
  workerServers: string[],
  event: QueueEvent,
  queueManager: QueueManger,
  scriptPath: string,
  timeBeforeScriptCanRun: number,
  onSuccessEvent: { status: BatchStatus; scriptCompletionTime: number }
  // runsOnOneMachine?: boolean
) => {
  let foundValidServer = false;
  const threadsNeeded = getThreads(ns, event);

  // Fail-safe to avoid infinite triggers without actual results
  if (threadsNeeded <= 0) {
    ns.print("nothing needed");

    queueManager.addEvent({
      id: Math.random() + Date.now(),
      server: event.server,
      status: onSuccessEvent.status,
      timeScriptsDone:
        Date.now() +
        timeBeforeScriptCanRun +
        onSuccessEvent.scriptCompletionTime,
      script: scriptPath,
      threads: 0,
    });

    queueManager.removeEvent(event.id);

    return true;
  }

  for (let index = 0; index < workerServers.length; index++) {
    const workerServer = workerServers[index];
    const workerServerPossibleThreadCount = getPossibleThreadCount(
      ns,
      workerServer,
      scriptPath
    );

    if (workerServerPossibleThreadCount >= threadsNeeded) {
      ns.exec(
        scriptPath,
        workerServer,
        threadsNeeded,
        event.server,
        timeBeforeScriptCanRun,
        (Math.random() + Date.now()).toString()
      );

      queueManager.addEvent({
        id: Math.random() + Date.now(),
        server: event.server,
        status: onSuccessEvent.status,
        timeScriptsDone:
          Date.now() +
          timeBeforeScriptCanRun +
          onSuccessEvent.scriptCompletionTime +
          short,
        script: scriptPath,
        threads: 0,
      });

      queueManager.removeEvent(event.id);

      foundValidServer = true;
      break;
    }
  }

  return foundValidServer;
};

const prepServers = (
  ns: NS,
  workerServers: string[],
  queueManager: QueueManger
) => {
  for (let index = 0; index < batchableServers.length; index++) {
    const batchableServer = batchableServers[index];
    const threadsNeededToWeakenToMin = threadsNeededToWeaken(
      ns,
      batchableServer
    );
    const threadsNeededToGrowToMax = threadsNeededToGrow(ns, {
      server: batchableServer,
    });
    const threadsNeededToCompensateGrowSecurity = Math.ceil(
      (threadsNeededToGrowToMax * growThreadSecurityIncrease) /
        weakenThreadSecutiryDecrease
    );
    let initialWeakenDone = 0;
    let initialGrowDone = 0;

    for (let index = 0; index < workerServers.length; index++) {
      const workerServer = workerServers[index];

      const growthTime = Math.ceil(ns.getGrowTime(batchableServer));
      const weakenTime = Math.ceil(ns.getWeakenTime(batchableServer));

      const workerServerPossibleThreadCount = getPossibleThreadCount(
        ns,
        workerServer,
        weakenScriptPath
      );

      if (
        workerServerPossibleThreadCount >= threadsNeededToWeakenToMin &&
        !initialWeakenDone
      ) {
        if (threadsNeededToWeakenToMin > 0) {
          ns.exec(
            weakenScriptPath,
            workerServer,
            threadsNeededToWeakenToMin,
            batchableServer,
            0,
            (Math.random() + Date.now()).toString()
          );
        }
        initialWeakenDone = Date.now() + weakenTime;
      }

      if (
        initialWeakenDone &&
        workerServerPossibleThreadCount >= threadsNeededToGrowToMax
      ) {
        const timeTillScriptCanRun =
          initialWeakenDone - Date.now() - growthTime;

        if (threadsNeededToGrowToMax > 0) {
          ns.exec(
            growScriptPath,
            workerServer,
            threadsNeededToGrowToMax,
            batchableServer,
            timeTillScriptCanRun,
            (Math.random() + Date.now()).toString()
          );
        }
        initialGrowDone =
          timeTillScriptCanRun <= 0
            ? Date.now() + growthTime
            : timeTillScriptCanRun + growthTime + short;
      }

      if (
        initialGrowDone &&
        workerServerPossibleThreadCount >= threadsNeededToCompensateGrowSecurity
      ) {
        const timeTillScriptCanRun = initialGrowDone - Date.now() - weakenTime;

        if (threadsNeededToCompensateGrowSecurity > 0) {
          ns.exec(
            weakenScriptPath,
            workerServer,
            threadsNeededToCompensateGrowSecurity,
            batchableServer,
            timeTillScriptCanRun <= 0 ? 0 + short : timeTillScriptCanRun,
            (Math.random() + Date.now()).toString()
          );
        }

        queueManager.addEvent({
          id: Math.random() + Date.now(),
          server: batchableServer,
          status: "hackable",
          timeScriptsDone:
            timeTillScriptCanRun <= 0
              ? Date.now() + weakenTime
              : initialGrowDone + weakenTime + short,
          script: weakenScriptPath,
          threads: 0,
        });

        break;
      }
    }
  }
};

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  const queueManager = new QueueManger();
  const workerServers = await getWorkerServers(ns, {
    includeHome:
      (ns.args[0] as string) === "home" || (ns.args[0] as string) === "all",
    includeHackableServers: (ns.args[0] as string) === "all",
  });
  prepServers(ns, workerServers, queueManager);

  while (true) {
    const events = queueManager.queue;

    ns.print(events);

    for (let index = 0; index < events.length; index++) {
      const event = events[index];

      let res = false;
      if (event.status === "hackable") {
        const hackTime = Math.ceil(ns.getHackTime(event.server));

        res = runScript(
          ns,
          workerServers,
          event,
          queueManager,
          hackScriptPath,
          event.timeScriptsDone - Date.now() - hackTime,
          {
            status: "fullyHacked",
            scriptCompletionTime: hackTime,
          }
        );
        if (!res) {
          break;
        }
      }
      if (event.status === "needsGrowing") {
        const growthTime = Math.ceil(ns.getGrowTime(event.server));

        res = runScript(
          ns,
          workerServers,
          event,
          queueManager,
          growScriptPath,
          event.timeScriptsDone - Date.now() - growthTime,
          {
            status: "fullyGrown",
            scriptCompletionTime: growthTime,
          }
        );
        if (res) {
          break;
        }
      }
      if (event.status === "fullyGrown" || event.status === "fullyHacked") {
        const serverWeakenTime = Math.ceil(ns.getWeakenTime(event.server));

        res = runScript(
          ns,
          workerServers,
          event,
          queueManager,
          weakenScriptPath,
          event.timeScriptsDone - Date.now() - serverWeakenTime,
          {
            status: event.status === "fullyGrown" ? "hackable" : "needsGrowing",
            scriptCompletionTime: serverWeakenTime,
          }
        );
      }
      if (!res) {
        break;
      }
      index++;
    }

    await ns.sleep(skip);
  }
}
