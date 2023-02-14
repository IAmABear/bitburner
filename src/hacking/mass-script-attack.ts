import getWorkerServers from "/utils/getWorkerServers";
import getPossibleThreadCount from "/utils/getPossibleThreadCount";
import config from "config";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  const scriptPath = ns.args[0] as string;
  const targatableServer = ns.args[1] as string;

  if (!scriptPath || !targatableServer) {
    ns.tprint(
      colorPicker(
        "Missing scriptPath and/or taratableServer parameter. Exiting....",
        "red"
      )
    );
    return;
  }

  while (true) {
    const workerServers = await getWorkerServers(ns, {
      includeHome:
        (ns.args[2] as string) === "home" || (ns.args[2] as string) === "all",
      includeHackableServers: (ns.args[2] as string) === "all",
    });

    workerServers.forEach((workerServer: string) => {
      const workerServerPossibleThreadCount = getPossibleThreadCount(
        ns,
        workerServer,
        scriptPath
      );

      if (workerServerPossibleThreadCount) {
        ns.exec(
          scriptPath,
          workerServer,
          workerServerPossibleThreadCount,
          targatableServer,
          0,
          (Math.random() + Date.now()).toString()
        );
      }
    });

    await ns.sleep(config.timeouts.short);
  }
}
