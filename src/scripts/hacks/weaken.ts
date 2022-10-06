export async function main(ns: NS): Promise<number> {
  return await ns.weaken(ns.args[0] as string);
}
