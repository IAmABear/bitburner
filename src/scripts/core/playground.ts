export async function main(ns: NS): Promise<void> {
  const server = "n00dles";

  ns.tprint(ns.getServerGrowth(server));

  const maxMoney = ns.getServerMaxMoney(server);
  const currentMoney = ns.getServerMoneyAvailable(server);
  const factor = 100 - (currentMoney * 100) / maxMoney;

  ns.tprint(`${maxMoney} - ${currentMoney} - ${factor}`);

  if (factor > 1) {
    ns.tprint(
      `${ns.growthAnalyze(server, factor)} - ${ns.growthAnalyzeSecurity(
        factor
      )}`
    );
  }
}
