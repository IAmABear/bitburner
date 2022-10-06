export default async (
  ns: NS,
  {
    includeHome = false,
    includeGhost = false,
    mustHaveRootAccess = false,
  }: {
    includeHome: boolean;
    includeGhost: boolean;
    mustHaveRootAccess?: boolean;
  }
): Promise<string[]> => {
  const scannedServers: string[] = [];

  async function scanServer(
    ns: any,
    server: string,
    {
      includeGhost,
      includeHome,
    }: {
      includeHome: boolean;
      includeGhost: boolean;
      mustHaveRootAccess?: boolean;
    }
  ) {
    const serversFound = ns.scan(server);

    for (const serverFoundIndex in serversFound) {
      const serverFound = serversFound[serverFoundIndex];

      if (!scannedServers.includes(serverFound)) {
        if (
          (includeHome && serverFound === "home") ||
          (includeGhost && serverFound.includes("ghost-")) ||
          (!serverFound.includes("ghost-") && serverFound !== "home")
        ) {
          scannedServers.push(serverFound);
          await scanServer(ns, serverFound, { includeGhost, includeHome });
        }
      }
    }

    return serversFound;
  }
  await scanServer(ns, "home", { includeGhost, includeHome });

  return scannedServers.reduce((allServers: string[], currentServer) => {
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
