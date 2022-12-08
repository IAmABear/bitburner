export async function main(ns: NS): Promise<number> {
  if ((ns.args[1] as number) > 0) {
    await ns.sleep(ns.args[1] as number);
    return await ns.weaken(ns.args[0] as string);
  } else {
    return await ns.weaken(ns.args[0] as string);
  }
}
