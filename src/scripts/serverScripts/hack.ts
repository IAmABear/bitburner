export async function main(ns: NS): Promise<number> {
  return await ns.hack(ns.args[0] as string);
}
