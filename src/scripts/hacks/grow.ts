export async function main(ns: NS): Promise<number> {
  return await ns.grow(ns.args[0] as string);
}
