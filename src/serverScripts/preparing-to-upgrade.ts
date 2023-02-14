import config from "config";

/**
 * The sole purpose for this script is to run indefinetly so we know the server
 * has been targeted for an upgrade. This is done to avoid killing servers which
 * still have scripts triggered on them which could (and most probally will)
 * screw up timings that are required in event/batch hacking.
 *
 * @param ns The NetScript object
 */
export async function main(ns: NS): Promise<void> {
  while (true) {
    await ns.sleep(config.timeouts.veryLong);
  }
}
