import getPossibleThreadCount from "/utils/getPossibleThreadCount";
import QueueManger from "/utils/queueManager";
import threadsNeededToGrow from "/utils/threadsNeededToGrow";
import threadsNeededToWeaken from "/utils/threadsNeededToWeaken";
import config from "config";

const growThreadSecurityIncrease = 0.004;
const weakenThreadsecurityDecrease = 0.05;

export default (
  ns: NS,
  batchableServer: string,
  workerServers: string[],
  queueManager?: QueueManger
): void => {
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
      config.scriptPaths.weakenScriptPath
    );

    if (
      workerServerPossibleThreadCount >= threadsNeededToWeakenToMin &&
      initialWeakenDone === 0
    ) {
      if (threadsNeededToWeakenToMin > 0) {
        ns.exec(
          config.scriptPaths.weakenScriptPath,
          workerServer,
          threadsNeededToWeakenToMin,
          batchableServer,
          0,
          (Math.random() + Date.now()).toString()
        );
      }
      initialWeakenDone = Date.now() + weakenTime + config.timeouts.long;
    }

    if (
      initialWeakenDone &&
      workerServerPossibleThreadCount >= threadsNeededToGrowToMax
    ) {
      const timeTillScriptCanRun = initialWeakenDone - Date.now() - growthTime;

      if (threadsNeededToGrowToMax > 0) {
        ns.exec(
          config.scriptPaths.growScriptPath,
          workerServer,
          threadsNeededToGrowToMax,
          batchableServer,
          timeTillScriptCanRun,
          (Math.random() + Date.now()).toString()
        );
      }

      initialGrowDone =
        timeTillScriptCanRun <= 0
          ? Date.now() + growthTime + config.timeouts.short
          : Date.now() +
            timeTillScriptCanRun +
            growthTime +
            config.timeouts.short;
    }

    if (
      initialGrowDone &&
      workerServerPossibleThreadCount >= threadsNeededToCompensateGrowSecurity
    ) {
      const timeTillScriptCanRun =
        initialGrowDone - Date.now() + config.timeouts.short;
      if (threadsNeededToCompensateGrowSecurity > 0) {
        ns.exec(
          config.scriptPaths.weakenScriptPath,
          workerServer,
          threadsNeededToCompensateGrowSecurity,
          batchableServer,
          timeTillScriptCanRun,
          (Math.random() + Date.now()).toString()
        );
      }

      if (queueManager) {
        queueManager.addEvent({
          id: Math.random() + Date.now(),
          server: batchableServer,
          status: "hackable",
          timeScriptsDone:
            Date.now() +
            timeTillScriptCanRun +
            weakenTime +
            config.timeouts.long,
          script: config.scriptPaths.weakenScriptPath,
          threads: 0,
        });
      }

      break;
    }
  }
};
