import optimalThreads from "/optimalThreads";
import { QueueEvent } from "/utils/queueManager";

const getBasicThreadCalculation = (ns: NS, event: QueueEvent) => {
  const serverThreads = optimalThreads[event.server];

  if (!serverThreads) {
    ns.tprint(`No optimal threads found for ${event.server}!`);
    return 0;
  }

  if (event.status === "hackable") {
    return Math.floor(optimalThreads[event.server].hackThreads / 4);
  }

  if (event.status === "needsGrowing") {
    return Math.ceil(optimalThreads[event.server].growThreads);
  }

  if (event.status === "fullyGrown" || event.status === "fullyHacked") {
    return Math.ceil(optimalThreads[event.server].weakenThreads);
  }

  ns.tprint(`${event.status} returning 0?`);

  return 0;
};

export default (ns: NS, event: QueueEvent): number => {
  return getBasicThreadCalculation(ns, event);
};
