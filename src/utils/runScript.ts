import getThreads from "utils/getThreads";
import QueueManger, { QueueEvent } from "utils/queueManager";
import config from "config";
import getPossibleThreadCount from "utils/getPossibleThreadCount";
import calculateEffects from "utils/calculateEffects";

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
          config.timeouts.short,
        script: scriptPath,
        threads: 0,
        effects: event.effects,
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
      !ns.scriptRunning(
        config.scriptPaths.preparingToUpgradeScriptPath,
        workerServer
      )
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
      //     content: scriptPath.split("/serverScripts/")[1],
      //     start:
      //       Date.now() +
      //       scriptTimeoutBeforeRunning +
      //       onSuccessEvent.scriptCompletionTime +
      //       config.timeouts.short,
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
            config.timeouts.short,
          script: scriptPath,
          threads: 0,
          effects: ns.fileExists("Formulas.exe")
            ? calculateEffects(ns, scriptPath, threadsNeeded, event)
            : undefined,
        });
      }

      foundValidServer = true;
      break;
    }
  }

  return foundValidServer;
};
