import getServers from "/scripts/utils/getServers.js";
import {
  growScriptPath,
  weakenScriptPath,
  hackScriptPath,
} from "/scripts/utils/scriptPaths.js";

export async function main(ns: NS): Promise<void> {
  const servers = await getServers(ns, {
    includeHome: false,
    includeGhost: true,
    onlyGhost: true,
  });
  const results = [];

  for (let index = 0; index < servers.length; index++) {
    const server: string = servers[index];
    const serverMaxRam = ns.getServerMaxRam(server);

    results.push({
      [server]: {
        hack: Math.ceil(
          Math.floor(serverMaxRam / ns.getScriptRam(hackScriptPath))
        ),
        grow: Math.ceil(
          Math.floor(serverMaxRam / ns.getScriptRam(growScriptPath))
        ),
        weaken: Math.ceil(
          Math.floor(serverMaxRam / ns.getScriptRam(weakenScriptPath))
        ),
      },
    });
  }

  ns.tprint(results);
}
