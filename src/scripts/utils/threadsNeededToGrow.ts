export default (ns: NS, targetServer: string): number => {
  const currentMoney = ns.getServerMoneyAvailable(targetServer);
  const maxMoney = ns.getServerMaxMoney(targetServer);
  const moneyDiff = (maxMoney - currentMoney) / currentMoney;

  return moneyDiff <= 1
    ? 0
    : Math.ceil(ns.growthAnalyze(targetServer, moneyDiff));
};
