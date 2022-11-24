export default (ns: NS, server: string, script: string): number => {
  const serverMaxRam = ns.getServerMaxRam(server);
  const serverUsedRam = ns.getServerUsedRam(server);
  const scriptRAM = ns.getScriptRam(script, server);

  return Math.ceil(Math.floor((serverMaxRam - serverUsedRam) / scriptRAM));
};
