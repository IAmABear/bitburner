import config from "config";

export default async (ns: NS, targetServer: string): Promise<boolean> =>
  await ns.scp(
    [
      config.scriptPaths.hackScriptPath,
      config.scriptPaths.growScriptPath,
      config.scriptPaths.weakenScriptPath,
      config.scriptPaths.preparingToUpgradeScriptPath,
    ],
    targetServer
  );
