export default async (ns: NS, server: string): Promise<void> => {
  let openPortCount = 0;

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

  if (ns.fileExists("relaySTMP.exe")) {
    ns.relaysmtp(server);
    openPortCount++;
  }

  if (ns.fileExists("SQLInject.exe")) {
    ns.sqlinject(server);
    openPortCount++;
  }

  // Can't do this yet due to missing the Source-File 4-1
  // ns.installBackdoor(server);

  if (openPortCount >= ns.getServerNumPortsRequired(server)) {
    ns.nuke(server);
    ns.tprint(server + " is hacked and we now have root access.");
  }
};
