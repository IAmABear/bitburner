export default (
  ns: NS,
  server: string,
  script: string,
  serverUsedRam?: number
): number => {
  // Fail safe in case a server just got upgraded and the previous one isn't
  // avaible any more
  if (!ns.serverExists(server)) {
    return 0;
  }

  const serverMaxRam = ns.getServerMaxRam(server);
  const scriptRAM = ns.getScriptRam(script, server);

  return Math.ceil(
    Math.floor(
      (serverMaxRam - (serverUsedRam || ns.getServerUsedRam(server))) /
        scriptRAM
    )
  );
};
