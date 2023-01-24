type Options = {
  includeHome: boolean;
  includeGhost: boolean;
  onlyGhost?: boolean;
  mustHaveRootAccess?: boolean;
};

export default async (
  ns: NS,
  {
    includeHome = false,
    includeGhost = false,
    onlyGhost = false,
    mustHaveRootAccess = false,
  }: Options
): Promise<string[]> => {
  const scannedServers: string[] = [];

  async function scanServer(
    ns: NS,
    server: string,
    { includeGhost, includeHome }: Options
  ) {
    const serversFound = ns.scan(server);

    for (const serverFoundIndex in serversFound) {
      const serverFound = serversFound[serverFoundIndex];

      if (!scannedServers.includes(serverFound)) {
        if (onlyGhost && serverFound.includes("ghost")) {
          scannedServers.push(serverFound);
          await scanServer(ns, serverFound, {
            includeGhost,
            includeHome,
            onlyGhost,
          });
        } else if (
          !onlyGhost &&
          ((includeHome && serverFound === "home") ||
            (includeGhost && serverFound.includes("ghost")) ||
            (!serverFound.includes("ghost") && serverFound !== "home"))
        ) {
          scannedServers.push(serverFound);
          await scanServer(ns, serverFound, {
            includeGhost,
            includeHome,
            onlyGhost,
          });
        }
      }
    }

    return serversFound;
  }
  await scanServer(ns, "home", { includeGhost, includeHome, onlyGhost });

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
