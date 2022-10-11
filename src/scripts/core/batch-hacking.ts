import getServers from "/scripts/utils/getServers.js";

// const growScriptPath = "/scripts/hacks/grow.js";
const weakenScriptPath = "/scripts/hacks/weaken.js";
// const hackScriptPath = "/scripts/hacks/hack.js";

const batchableServers = [
  { name: "foodnstuff", prepped: false },
  { name: "n00dles", prepped: false },
  { name: "sigma-cosmetics", prepped: false },
];

const prepServer = async (ns: NS, servers: string[]) => {
  ns.tprint(batchableServers);

  const targetServer = batchableServers.find(
    (server) => server.prepped === false
  );
  ns.tprint(targetServer);

  if (!targetServer) {
    return;
  }

  const serverMinSecurity = ns.getServerMinSecurityLevel(targetServer.name);
  const serverSecurity = ns.getServerSecurityLevel(targetServer.name);
  const secDiff = serverSecurity - serverMinSecurity;
  const weakenEffect = ns.weakenAnalyze(1);
  const weakenThreadsNeeded = Math.ceil(secDiff / weakenEffect);
  ns.tprint(`${serverMinSecurity} ${serverSecurity}`);
  let weakenScriptsActive = 0;

  const serverWeakenTime = ns.getWeakenTime(targetServer.name);
  let serverWeakenedToMinimum = null;
  ns.tprint(serverWeakenTime);

  await servers.forEach(async (currentServer) => {
    const neededThreads = weakenThreadsNeeded - weakenScriptsActive;
    const serverMaxRam = ns.getServerMaxRam(currentServer);
    const serverUsedRam = ns.getServerUsedRam(currentServer);
    const scriptRAM = ns.getScriptRam(weakenScriptPath, currentServer);
    const possibleThreadCount = Math.ceil(
      Math.floor((serverMaxRam - serverUsedRam) / scriptRAM)
    );
    const threadCount =
      possibleThreadCount >= neededThreads
        ? neededThreads
        : possibleThreadCount;

    if (threadCount !== 0) {
      ns.tprint(threadCount);
      ns.exec(weakenScriptPath, currentServer, threadCount, targetServer.name);
      weakenScriptsActive += threadCount;

      if (weakenScriptsActive === weakenThreadsNeeded) {
        ns.tprint("All weaken scripts needed triggered");
        serverWeakenedToMinimum = Date.now() + serverWeakenTime;

        const batachableServer = batchableServers.find(
          (server) => server.name === targetServer.name
        );
        if (batachableServer) {
          batachableServer.prepped = true;
          ns.tprint("new prep");
          return await prepServer(ns, servers);
        }
      }
    }
  });
};

/**
 * Batch hack a server enabling maximum profits.
 *
 * The initial implementation will focus on maximizing profits from a single
 * source of income. This is due to our current limitation in ram which will be
 * needed.
 *
 * A single batch consists of four actions:
 * - A hack script removes a predefined, precalculated amount of money from the
 *   target server.
 * - A weaken script counters the security increase of the hack script.
 * - A grow script counters the money decrease caused by the hack script.
 * - A weaken script counters the security increase caused by the grow script.
 *
 * Later versions will enable multiple source of income points to be hacked
 * (and maybe even calculate how many it can handle itself and scale accordingly).
 *
 * @param ns The bitburner NS scope
 */
export async function main(ns: NS): Promise<void> {
  const servers = await getServers(ns, {
    includeHome: false,
    includeGhost: false,
    onlyGhost: true,
  });

  await prepServer(ns, servers);
  /**
   * Before batches can be run a server should always be at minimum security
   * level to simplify this process
   *
   * Steps:
   * - Grow server to max money
   * - Weaken server till minimum security
   * - Hack for max profit
   * - Weaken server till minimum security
   */
}
