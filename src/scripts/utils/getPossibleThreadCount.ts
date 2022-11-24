export default (
  ns: NS,
  server: string,
  script: string,
  serverUsedRam?: number
): number => {
  const serverMaxRam = ns.getServerMaxRam(server);
  const scriptRAM = ns.getScriptRam(script, server);

  return Math.ceil(
    Math.floor(
      (serverMaxRam - (serverUsedRam || ns.getServerUsedRam(server))) /
        scriptRAM
    )
  );
};
