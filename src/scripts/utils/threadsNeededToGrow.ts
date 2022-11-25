export default (ns: NS, event: { server: string }): number => {
  const currentMoney = ns.getServerMoneyAvailable(event.server) || 1;
  const maxMoney = ns.getServerMaxMoney(event.server);
  const moneyDiff = (maxMoney - currentMoney) / currentMoney;

  if (moneyDiff === Infinity) {
    return 1;
  }

  return moneyDiff <= 1
    ? 0
    : Math.ceil(ns.growthAnalyze(event.server, moneyDiff));
};
