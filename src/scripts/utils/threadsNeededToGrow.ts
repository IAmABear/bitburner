export default (ns: NS, targetServer: string): number => {
  const currentMoney = ns.getServerMoneyAvailable(targetServer) || 1;
  const maxMoney = ns.getServerMaxMoney(targetServer);
  const moneyDiff = (maxMoney - currentMoney) / currentMoney;

  if (moneyDiff === Infinity) {
    return 1;
  }

  return moneyDiff <= 1
    ? 0
    : Math.ceil(ns.growthAnalyze(targetServer, moneyDiff));
};
