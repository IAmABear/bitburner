import serversToHack from "/scripts/utils/serversToHack";

export async function main(ns: NS): Promise<void> {
  const servers = await serversToHack(ns, 3);

  ns.tprint(servers);
}
