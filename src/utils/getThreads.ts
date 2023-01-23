import optimalThreads from "optimalThreads";
import { QueueEvent } from "utils/queueManager";
import config from "config";

const targetMoneyHack = 0.3;
const weakenSecDecrease = 0.05;

const getBasicThreadCalculation = (ns: NS, event: QueueEvent) => {
  const serverThreads = optimalThreads[event.server];

  if (!serverThreads) {
    ns.tprint(`No optimal threads found for ${event.server}!`);
    return 0;
  }

  if (event.status === "hackable") {
    return Math.floor(serverThreads.hackThreads / 4);
  }

  if (event.status === "needsGrowing") {
    return Math.ceil(serverThreads.growThreads);
  }

  if (event.status === "fullyGrown" || event.status === "fullyHacked") {
    return Math.ceil(serverThreads.weakenThreads);
  }

  ns.print(`${event.status} returning 0?`);

  return 0;
};

const growthCalc = (ns: NS, event: QueueEvent, threads = 1): number => {
  if (!event.effects) {
    return 1;
  }

  const growthPercentage = ns.formulas.hacking.growPercent(
    event.effects?.serverStateAfterExecution,
    threads,
    event.effects?.playerStateAfterExecution,
    event.effects?.serverStateAfterExecution.cpuCores
  );

  const newMoney =
    event.effects.serverStateAfterExecution.moneyAvailable * growthPercentage;

  if (newMoney < event.effects.serverStateAfterExecution.moneyMax) {
    return growthCalc(ns, event, threads * 2);
  }

  return threads;
};

const getDynamicThreadCalculation = (ns: NS, event: QueueEvent) => {
  if (!event.effects) {
    ns.print(
      `No server data avaible for calucation, falling back tp basic thread calculation`
    );
    return getBasicThreadCalculation(ns, event);
  }

  const server = event.effects.serverStateAfterExecution;
  const player = event.effects.playerStateAfterExecution;

  if (event.script === config.scriptPaths.hackScriptPath) {
    const hackPercentPerThread = ns.formulas.hacking.hackPercent(
      server,
      player
    );
    const moneyPerThread =
      (event.effects.serverStateAfterExecution.moneyMax *
        hackPercentPerThread) /
      100;
    const moneyTarget =
      event.effects.serverStateAfterExecution.moneyMax * targetMoneyHack;

    return Math.floor(
      (event.effects.serverStateAfterExecution.moneyAvailable - moneyTarget) /
        moneyPerThread
    );
  }

  if (event.script === config.scriptPaths.weakenScriptPath) {
    return Math.ceil(
      (event.effects.serverStateAfterExecution.hackDifficulty -
        event.effects.serverStateAfterExecution.minDifficulty) /
        weakenSecDecrease
    );
  }

  if (event.script === config.scriptPaths.growScriptPath) {
    return growthCalc(ns, event);
  }

  return 0;
};

export default (ns: NS, event: QueueEvent): number => {
  return ns.fileExists("Formulas.exe")
    ? getDynamicThreadCalculation(ns, event)
    : getBasicThreadCalculation(ns, event);
};
