export default async (
  ns: NS,
  server: string,
  checkIfRootAction = true
): Promise<void> => {
  let openPortCount = 0;

  const hasRootAccess = ns.hasRootAccess(server);
  if (hasRootAccess && checkIfRootAction) {
    return;
  }

  /**
   * For now just install all the things
   */

  if (ns.fileExists("HTTPWorm.exe")) {
    ns.httpworm(server);
    openPortCount++;
  }

  if (ns.fileExists("BruteSSH.exe")) {
    ns.brutessh(server);
    openPortCount++;
  }

  if (ns.fileExists("FTPCrack.exe")) {
    ns.ftpcrack(server);
    openPortCount++;
  }

  if (ns.fileExists("relaySMTP.exe")) {
    ns.relaysmtp(server);
    openPortCount++;
  }

  if (ns.fileExists("SQLInject.exe")) {
    ns.sqlinject(server);
    openPortCount++;
  }

  // Can't do this yet due to missing the Source-File 4-1
  // ns.installBackdoor(server);

  if (!hasRootAccess && openPortCount >= ns.getServerNumPortsRequired(server)) {
    ns.nuke(server);
    ns.print(server + " is hacked and we now have root access.");
  }
};