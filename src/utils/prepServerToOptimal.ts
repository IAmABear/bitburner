import colorPicker from "/utils/colorPicker";
import QueueManager from "/utils/queueManager";
import config from "config";
import threadsNeededToWeaken from "/utils/threadsNeededToWeaken";
import threadsNeededToGrow from "/utils/threadsNeededToGrow";
import getPossibleThreadCount from "/utils/getPossibleThreadCount";

/**
 *
 * @param ns The NetScript namespace provided by bitburner.
 * @param server The server we want to target.
 * @param workerServers The servers avaible to do the work.
 * @param scriptPath The script we want to trigger.
 * @param requestedThreads The amount of threads that need to be tiggered in total.
 * @returns The timestamp when the scripts are done running.
 */
const runScriptOnServers = async (
  ns: NS,
  server: string,
  workerServers: string[],
  scriptPath: string,
  requestedThreads: number
): Promise<number> => {
  let threadsNeeded = requestedThreads;
  for (const workerServer of workerServers) {
    const possibleThreadCount = getPossibleThreadCount(
      ns,
      workerServer,
      scriptPath
    );

    const moreThreadsAvaibleThenNeeded = possibleThreadCount >= threadsNeeded;
    const threads = moreThreadsAvaibleThenNeeded
      ? threadsNeeded
      : possibleThreadCount;
    threadsNeeded -= threads;

    if (threads) {
      ns.exec(
        scriptPath,
        workerServer,
        threads,
        server,
        0,
        (Math.random() + Date.now()).toString()
      );
    }

    if (moreThreadsAvaibleThenNeeded) {
      break;
    }
  }

  if (threadsNeeded) {
    // Since we already looped though all our servers we shall wait for a short
    // while to avoid an infinite loop.
    await ns.sleep(config.timeouts.short);
    return await runScriptOnServers(
      ns,
      server,
      workerServers,
      scriptPath,
      threadsNeeded
    );
  }

  return (
    Date.now() +
    (scriptPath === config.scriptPaths.growScriptPath
      ? Math.ceil(ns.getGrowTime(server))
      : Math.ceil(ns.getWeakenTime(server)))
  );
};

const prepServerToOptimal = async (
  ns: NS,
  server: string,
  workerServers: string[],
  queueManager?: QueueManager
): Promise<boolean> => {
  ns.print("-----------------------------------------");
  ns.print(
    `Starting to prep ${colorPicker(server, "white")} with: \n ${
      workerServers.length
        ? colorPicker(`${workerServers.length} worker servers avaible`, "green")
        : colorPicker("no worker servers avaible", "red")
    }.\n ${
      queueManager
        ? colorPicker("queueManager is supplied", "green")
        : colorPicker("No queueManager is supplied, will be ignored.", "red")
    }`
  );
  const threadsSecurityToMin = threadsNeededToWeaken(ns, server);
  const threadsGrowthToMax = threadsNeededToGrow(ns, {
    server: server,
  });
  const threadsNeededToCompensateGrowSecurity = Math.ceil(
    (threadsGrowthToMax * config.bitburner.growThreadSecurityIncrease) /
      config.bitburner.weakenThreadSecurityDecrease
  );

  ns.print(
    `Threads needed to weaken to minimum security: ${threadsSecurityToMin}.`
  );
  ns.print(`Threads needed to grow to maximum money: ${threadsGrowthToMax}.`);
  ns.print(
    `Threads needed to compensate growth effect: ${threadsNeededToCompensateGrowSecurity}.`
  );

  /**
   * Initial prepping server by executing the following commands:
   * - Weaken sever to minimal security to ensure our scripts are not failing
   *   due to the server security being to high.
   * - Trigger all the growth calls to raise the server money to its maximum.
   * - Weaken the servers again to ensure they are at the minimum secutiry again
   *   to avoid the next calls failing due to secutiry issues.
   *
   * The current implementation does still have a chance to not reach maximum
   * money due to security issues since the growth calls are not nessesairly
   * done on one server in go. Which means multiple servers trigger the growt
   * calls which in turn increases security before all the growth calls are
   * finalized. For now we'll just check at the end if the server need more
   * growth scripts triggered and if so, we'll just re-run this entire method.
   *
   * The script also waits for the initial weaken to finish before triggering
   * the growth scripts. This is also due to the security still being high which
   * might cause the growth calls to fail in turn. This will slow done the
   * initial prepping quite a bit, but the increase stability is worth it.
   */
  const initialWeakenDone = await runScriptOnServers(
    ns,
    server,
    workerServers,
    config.scriptPaths.weakenScriptPath,
    threadsSecurityToMin
  );
  await ns.sleep(initialWeakenDone - Date.now());
  const initialGrowthDone = await runScriptOnServers(
    ns,
    server,
    workerServers,
    config.scriptPaths.growScriptPath,
    threadsGrowthToMax
  );
  const timeBeforeWeakenScriptTriggering =
    initialGrowthDone - Date.now() - Math.ceil(ns.getWeakenTime(server));
  await ns.sleep(
    timeBeforeWeakenScriptTriggering >= 0 ? timeBeforeWeakenScriptTriggering : 0
  );
  const finalWeakenDone = await runScriptOnServers(
    ns,
    server,
    workerServers,
    config.scriptPaths.weakenScriptPath,
    threadsNeededToCompensateGrowSecurity
  );
  await ns.sleep(finalWeakenDone - Date.now());

  const growthNeededAfterSetup = threadsNeededToGrow(ns, {
    server: server,
  });
  const weakenNeededAfterSetup = threadsNeededToWeaken(ns, server);

  if (growthNeededAfterSetup || weakenNeededAfterSetup) {
    return prepServerToOptimal(ns, server, workerServers, queueManager);
  }

  if (queueManager) {
    queueManager.addEvent({
      id: Math.random() + Date.now(),
      server,
      status: "hackable",
      timeScriptsDone: Date.now(),
      script: config.scriptPaths.weakenScriptPath,
      threads: 0,
    });
  }

  return ns.sleep(config.timeouts.skip);
};

export default prepServerToOptimal;
