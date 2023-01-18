import getServers from "/scripts/utils/getServers";

type WorkerServerOptions = {
  includeHome: boolean;
  includeHackableServers: boolean;
};

export default async (
  ns: NS,
  { includeHome = false, includeHackableServers = false }: WorkerServerOptions
): Promise<string[]> => {
  let servers = await getServers(ns, {
    includeHome: false,
    includeGhost: true,
    onlyGhost: true,
  });

  if (includeHome) {
    servers.push("home");
  }

  if (includeHackableServers) {
    const normalServers = await getServers(ns, {
      includeHome: false,
      includeGhost: false,
    });
    const serversWithAdminRights = normalServers.filter(
      (server: string) => ns.getServer(server).hasAdminRights
    );

    servers = [...servers, ...serversWithAdminRights];
  }

  return servers;
};
