import QueueManger from "/scripts/utils/queueManager";
import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";
import { skip } from "/scripts/utils/timeoutTimes";
import getWorkerServers from "/scripts/utils/getWorkerServers";
import runScript from "/scripts/utils/runScript";
import prepServer from "/scripts/utils/prepServer";

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

    return;
  }

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
      void prepServer(ns, targetServer, workerServers, queueManager);
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
            status: event.status === "fullyGrown" ? "hackable" : "needsGrowing",
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
