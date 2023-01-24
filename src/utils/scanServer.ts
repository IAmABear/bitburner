import config from "config";
const scannedServers: string[] = [];

const scanServer = async (ns: NS, server: string): Promise<string[]> => {
  const serversFound = ns.scan(server);

  for (const serverFoundIndex in serversFound) {
    const serverFound = serversFound[serverFoundIndex];
    if (
      !scannedServers.includes(serverFound) &&
      !serverFound.includes(config.namingConventions.ghostServersPrefix)
    ) {
      if (!serverFound.includes("home")) {
        scannedServers.push(serverFound);
      }

      await scanServer(ns, serverFound);
    }
  }

  return scannedServers;
};

export default scanServer;
