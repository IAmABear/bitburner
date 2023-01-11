export default (ns: NS, event: { server: string }): number => {
  const currentMoney = ns.getServerMoneyAvailable(event.server) || 1;
  const maxMoney = ns.getServerMaxMoney(event.server);
  const moneyDiff = maxMoney / currentMoney;
  // ns.tprint(
  //   `currentMoney: ${currentMoney}; maxMoney: ${maxMoney}; moneyDiff: ${moneyDiff}; Math.ceil(ns.growthAnalyze(event.server, moneyDiff)): ${Math.ceil(
  //     ns.growthAnalyze(event.server, moneyDiff)
  //   )}`
  // );
  if (moneyDiff === Infinity) {
    return 1;
  }

  return moneyDiff <= 1
    ? 0
    : Math.ceil(ns.growthAnalyze(event.server, moneyDiff));
};
