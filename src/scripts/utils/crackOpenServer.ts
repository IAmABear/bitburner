/* eslint-disable no-empty */
export default async (ns: NS, server: string): Promise<void> => {
  try {
    ns.httpworm(server);
  } catch (e) {}
  try {
    ns.brutessh(server);
  } catch (e) {}

  try {
    ns.ftpcrack(server);
  } catch (e) {}

  try {
    ns.relaysmtp(server);
  } catch (e) {}

  try {
    ns.sqlinject(server);
  } catch (e) {}

  try {
    ns.nuke(server);
    ns.print(server + " is hacked and we now have root access.");
  } catch (e) {}

  // Can't do this yet due to missing the Source-File 4-1
  // ns.installBackdoor(server);
};
