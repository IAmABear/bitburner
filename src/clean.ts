export async function main(ns: NS): Promise<void> {
  const targetServer = (ns.args[0] as string) || "home";
  const serverFiles = ns.ls(targetServer, "js");

  for (const serverFile in serverFiles) {
    await ns.killall(targetServer);
    ns.rm(serverFiles[serverFile], targetServer);
  }
}
