// @ts-nocheck
export default async (
  ns: any,
  {
    inlcudeHome = false,
    includeGhost = false,
    mustHaveRootAccess = false,
  }: {
    inlcudeHome: boolean;
    includeGhost: boolean;
    mustHaveRootAccess: boolean;
  }
): Array<string> => {
  const scannedServers: Array<string> = [];

  async function scanServer(
    ns: any,
    server: string,
    {
      includeGhost,
      inlcudeHome,
    }: {
      inlcudeHome: boolean;
      includeGhost: boolean;
      mustHaveRootAccess: boolean;
    }
  ) {
    const serversFound = ns.scan(server);

    for (const serverFoundIndex in serversFound) {
      const serverFound = serversFound[serverFoundIndex];

      if (!scannedServers.includes(serverFound)) {
        if (
          (inlcudeHome && serverFound === "home") ||
          (includeGhost && serverFound.includes("ghost-")) ||
          (!serverFound.includes("ghost-") && serverFound !== "home")
        ) {
          scannedServers.push(serverFound);
          await scanServer(ns, serverFound, { includeGhost, inlcudeHome });
        }
      }
    }

    return serversFound;
  }
  await scanServer(ns, "home", { includeGhost, inlcudeHome });

  return scannedServers.reduce((allServers, currentServer) => {
    if (mustHaveRootAccess) {
      if (ns.hasRootAccess(currentServer)) {
        return [...allServers, currentServer];
      }
    } else {
      return [...allServers, currentServer];
    }

    return allServers;
  }, []);
};
