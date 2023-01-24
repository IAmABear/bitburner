import QueueManger, { QueueEvent } from "/utils/queueManager";
import config from "/config";
import getWorkerServers from "/utils/getWorkerServers";
import runScript, { BatchStatus } from "/utils/runScript";
import prepServer from "/utils/prepServer";
import serversToHack from "/utils/serversToHack";

const getCompletionStatus = (
  ns: NS,
  event: QueueEvent
): { status: BatchStatus; scriptCompletionTime: number; script: string } => {
  ns.print(event);
  switch (event.status) {
    case "hackable":
      return {
        status: "fullyHacked",
        scriptCompletionTime: Math.ceil(ns.getHackTime(event.server)),
        script: config.scriptPaths.hackScriptPath,
      };
      break;
    case "needsGrowing":
      return {
        status: "fullyGrown",
        scriptCompletionTime: Math.ceil(ns.getGrowTime(event.server)),
        script: config.scriptPaths.growScriptPath,
      };
      break;
    default:
      return {
        status: event.status === "fullyGrown" ? "hackable" : "needsGrowing",
        scriptCompletionTime: Math.ceil(ns.getWeakenTime(event.server)),
        script: config.scriptPaths.weakenScriptPath,
      };
      break;
  }
};

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  const queueManager = new QueueManger();
  const targatableServers = await serversToHack(ns);

  if (targatableServers.length === 0) {
    ns.tprint("No valid hackable servers found.");
    return;
  }

  const targetServer = targatableServers[0];

  while (true) {
    const events = queueManager.queue;

    const workerServers = await getWorkerServers(ns, {
      includeHome:
        (ns.args[0] as string) === "home" || (ns.args[0] as string) === "all",
      includeHackableServers: (ns.args[0] as string) === "all",
    });
    if (events.length === 0) {
      void prepServer(ns, targetServer.hostname, workerServers, queueManager);
      await ns.sleep(config.timeouts.medium);
    } else {
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        const completionStatus = getCompletionStatus(ns, event);

        const res = runScript(
          ns,
          workerServers,
          event,
          completionStatus.script,
          event.timeScriptsDone -
            Date.now() -
            completionStatus.scriptCompletionTime,
          completionStatus,
          queueManager
        );

        if (!res) {
          break;
        }

        index++;
      }
    }

    await ns.sleep(config.timeouts.skip);
  }
}
