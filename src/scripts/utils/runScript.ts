import getThreads from "/scripts/utils/getThreads";
import QueueManger, { QueueEvent } from "/scripts/utils/queueManager";
import { short } from "/scripts/utils/timeoutTimes";
import getPossibleThreadCount from "/scripts/utils/getPossibleThreadCount";
import { preparingToUpgradeScriptPath } from "/scripts/utils/scriptPaths";

export type BatchStatus =
  | "hackable"
  | "fullyGrown"
  | "fullyHacked"
  | "needsGrowing";

export default (
  ns: NS,
  workerServers: string[],
  event: QueueEvent,
  scriptPath: string,
  timeBeforeScriptCanRun: number,
  onSuccessEvent: { status: BatchStatus; scriptCompletionTime: number },
  queueManager?: QueueManger
): boolean => {
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

    if (
      workerServerPossibleThreadCount >= threadsNeeded &&
      !ns.scriptRunning(preparingToUpgradeScriptPath, workerServer)
    ) {
      ns.exec(
        scriptPath,
        workerServer,
        threadsNeeded,
        event.server,
        scriptTimeoutBeforeRunning,
        (Math.random() + Date.now()).toString()
      );

      // Enable the following the log the events to display them.
      // ns.write(
      //   "run-script-events.js",
      //   JSON.stringify({
      //     id: (Math.random() + Date.now()).toString(),
      //     content: scriptPath.split("/scripts/serverScripts/")[1],
      //     start:
      //       Date.now() +
      //       scriptTimeoutBeforeRunning +
      //       onSuccessEvent.scriptCompletionTime +
      //       short,
      //   }),
      //   "a"
      // );

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
