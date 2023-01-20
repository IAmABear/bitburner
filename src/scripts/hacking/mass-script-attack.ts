import getWorkerServers from "/scripts/utils/getWorkerServers";
import getPossibleThreadCount from "/scripts/utils/getPossibleThreadCount";

export async function main(ns: NS): Promise<void> {
  ns.disableLog("ALL");

  const scriptPath = ns.args[0] as string;
  const targatableServer = ns.args[1] as string;

  if (!targatableServer) {
    ns.tprint("No valid hackable servers found.");
    return;
  }

  const workerServers = await getWorkerServers(ns, {
    includeHome:
      (ns.args[0] as string) === "home" || (ns.args[0] as string) === "all",
    includeHackableServers: (ns.args[0] as string) === "all",
  });

  workerServers.forEach((workerServer: string) => {
    const workerServerPossibleThreadCount = getPossibleThreadCount(
      ns,
      workerServer,
      scriptPath
    );

    ns.exec(
      scriptPath,
      workerServer,
      workerServerPossibleThreadCount,
      targatableServer,
      0,
      (Math.random() + Date.now()).toString()
    );
  });
}
