import getPossibleThreadCount from "/scripts/utils/getPossibleThreadCount";

import QueueManger, { QueueEvent } from "/scripts/utils/queueManager";
import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import threadsNeededToGrow from "/scripts/utils/threadsNeededToGrow";
import threadsNeededToWeaken from "/scripts/utils/threadsNeededToWeaken";
import { long, short, skip } from "/scripts/utils/timeoutTimes";
import getThreads from "/scripts/utils/getThreads";
import getWorkerServers from "/scripts/utils/getWorkerServers";

type BatchStatus = "hackable" | "fullyGrown" | "fullyHacked" | "needsGrowing";

const growThreadSecurityIncrease = 0.004;
const weakenThreadsecurityDecrease = 0.05;

const runScript = (
  ns: NS,
  workerServers: string[],
  event: QueueEvent,
  scriptPath: string,
  timeBeforeScriptCanRun: number,
  onSuccessEvent: { status: BatchStatus; scriptCompletionTime: number },
  queueManager?: QueueManger
) => {
  let foundValidServer = false;
  const threadsNeeded = getThreads(ns, event);
  // Fail-safe when the script time is negative
  const scriptTimeoutBeforeRunning =
    timeBeforeScriptCanRun < 0 ? 0 : timeBeforeScriptCanRun;

  // Fail-safe to avoid infinite triggers without actual results
  if (threadsNeeded <= 0) {
    ns.print("nothing needed");

    if (queueManager) {
      queueManager.addEvent({
        id: Math.random() + Date.now(),
        server: event.server,
        status: onSuccessEvent.status,
        timeScriptsDone:
          Date.now() +
          scriptTimeoutBeforeRunning +
          onSuccessEvent.scriptCompletionTime +
          short,
        script: scriptPath,
        threads: 0,
      });

      queueManager.removeEvent(event.id);
    }

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
        scriptTimeoutBeforeRunning,
        (Math.random() + Date.now()).toString()
      );

      if (queueManager) {
        queueManager.removeEvent(event.id);
        queueManager.addEvent({
          id: Math.random() + Date.now(),
          server: event.server,
          status: onSuccessEvent.status,
          timeScriptsDone:
            Date.now() +
            scriptTimeoutBeforeRunning +
            onSuccessEvent.scriptCompletionTime +
            short,
          script: scriptPath,
          threads: 0,
        });
      }

      foundValidServer = true;
      break;
    }
  }

  return foundValidServer;
};

const prepServer = (
  ns: NS,
  batchableServer: string,
  workerServers: string[],
  queueManager: QueueManger
) => {
  const threadsNeededToWeakenToMin = threadsNeededToWeaken(ns, batchableServer);
  const threadsNeededToGrowToMax = threadsNeededToGrow(ns, {
    server: batchableServer,
  });
  const threadsNeededToCompensateGrowSecurity = Math.ceil(
    (threadsNeededToGrowToMax * growThreadSecurityIncrease) /
      weakenThreadsecurityDecrease
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
      initialWeakenDone === 0
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
      initialWeakenDone = Date.now() + weakenTime + long;
    }

    if (
      initialWeakenDone &&
      workerServerPossibleThreadCount >= threadsNeededToGrowToMax
    ) {
      const timeTillScriptCanRun = initialWeakenDone - Date.now() - growthTime;

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
          ? Date.now() + growthTime + short
          : Date.now() + timeTillScriptCanRun + growthTime + short;
    }

    if (
      initialGrowDone &&
      workerServerPossibleThreadCount >= threadsNeededToCompensateGrowSecurity
    ) {
      const timeTillScriptCanRun = initialGrowDone - Date.now() + short;
      if (threadsNeededToCompensateGrowSecurity > 0) {
        ns.exec(
          weakenScriptPath,
          workerServer,
          threadsNeededToCompensateGrowSecurity,
          batchableServer,
          timeTillScriptCanRun,
          (Math.random() + Date.now()).toString()
        );
      }

      queueManager.addEvent({
        id: Math.random() + Date.now(),
        server: batchableServer,
        status: "hackable",
        timeScriptsDone: Date.now() + timeTillScriptCanRun + weakenTime + long,
        script: weakenScriptPath,
        threads: 0,
      });

      break;
    }
  }
};

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  if (ns.args.length === 1) {
    const batchableServers = ["joesguns", "zer0"];
    batchableServers.forEach((server: string) => {
      ns.exec(
        "/scripts/hacking/event-based/v2.js",
        "home",
        undefined,
        ...ns.args,
        server
      );
    });
  } else {
    const queueManager = new QueueManger();
    const targetServer = ns.args[1] as string;

    while (true) {
      const events = queueManager.queue;

      const workerServers = await getWorkerServers(ns, {
        includeHome:
          (ns.args[0] as string) === "home" || (ns.args[0] as string) === "all",
        includeHackableServers: (ns.args[0] as string) === "all",
      });
      if (events.length === 0) {
        prepServer(ns, targetServer, workerServers, queueManager);
      }

      for (let index = 0; index < events.length; index++) {
        const event = events[index];

        let res = false;
        if (event.status === "hackable") {
          const hackTime = Math.ceil(ns.getHackTime(event.server));

          res = runScript(
            ns,
            workerServers,
            event,
            hackScriptPath,
            event.timeScriptsDone - Date.now() - hackTime,
            {
              status: "fullyHacked",
              scriptCompletionTime: hackTime,
            },
            queueManager
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
            growScriptPath,
            event.timeScriptsDone - Date.now() - growthTime,
            {
              status: "fullyGrown",
              scriptCompletionTime: growthTime,
            },
            queueManager
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
            weakenScriptPath,
            event.timeScriptsDone - Date.now() - serverWeakenTime,
            {
              status:
                event.status === "fullyGrown" ? "hackable" : "needsGrowing",
              scriptCompletionTime: serverWeakenTime,
            },
            queueManager
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
}
