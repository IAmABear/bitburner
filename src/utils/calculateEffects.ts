import { Player, Server } from "/../NetscriptDefinitions";
import { QueueEvent } from "/scripts/utils/queueManager";
import {
  growScriptPath,
  hackScriptPath,
  weakenScriptPath,
} from "/scripts/utils/scriptPaths";

const hackSecurityIncrease = 0.002;
const growSecurityIncrease = 0.004;

const hackEffectServer = (
  ns: NS,
  threads: number,
  server: Server,
  player: Player
) => {
  const hackPercent = ns.formulas.hacking.hackPercent(server, player) * threads;

  return {
    ...server,
    moneyAvailable:
      server.moneyAvailable - (server.moneyAvailable * hackPercent) / 100,
    hackDifficulty: server.hackDifficulty + threads * hackSecurityIncrease,
  };
};

const weakenEffectServer = (ns: NS, threads: number, server: Server) => {
  const weakenEffect = ns.weakenAnalyze(threads, server.cpuCores);
  const newSecurity = server.hackDifficulty - weakenEffect;

  return {
    ...server,
    hackDifficulty:
      newSecurity <= server.minDifficulty ? server.minDifficulty : newSecurity,
  };
};

const growEffectServer = (
  ns: NS,
  threads: number,
  server: Server,
  player: Player
) => {
  const growEffect = ns.formulas.hacking.growPercent(
    server,
    threads,
    player,
    server.cpuCores
  );

  return {
    ...server,
    moneyAvailable:
      growEffect === Infinity ? 1 : server.moneyAvailable * growEffect,
    hackDifficulty: server.hackDifficulty + threads * growSecurityIncrease,
  };
};

const hackEffectPlayer = (
  ns: NS,
  threads: number,
  server: Server,
  player: Player
) => {
  const xp = ns.formulas.hacking.hackExp(server, player) * threads;

  return {
    ...player,
    exp: {
      ...player.exp,
      hacking: ns.formulas.skills.calculateSkill(
        player.exp.hacking + xp,
        player.mults.hacking_exp
      ),
    },
  };
};

/**
 * Currently unknown if weaken and hack / grow give different xp rates.
 * So for now I'll just assume they do.
 * @param ns
 * @param threads
 * @param server
 * @param player
 * @returns
 */
const weakenEffectPlayer = (
  ns: NS,
  threads: number,
  server: Server,
  player: Player
) => {
  const xp = ns.formulas.hacking.hackExp(server, player) * threads;

  return {
    ...player,
    exp: {
      ...player.exp,
      hacking: ns.formulas.skills.calculateSkill(
        player.exp.hacking + xp,
        player.mults.hacking_exp
      ),
    },
  };
};

/**
 * Currently unknown if weaken and hack / grow give different xp rates.
 * So for now I'll just assume they do.
 * @param ns
 * @param threads
 * @param server
 * @param player
 * @returns
 */
const growEffectPlayer = (
  ns: NS,
  threads: number,
  server: Server,
  player: Player
) => {
  const xp = ns.formulas.hacking.hackExp(server, player) * threads;

  return {
    ...player,
    exp: {
      ...player.exp,
      hacking: ns.formulas.skills.calculateSkill(
        player.exp.hacking + xp,
        player.mults.hacking_exp
      ),
    },
  };
};

export default (
  ns: NS,
  script: string,
  threads: number,
  event: QueueEvent
):
  | {
      serverStateAfterExecution: Server;
      playerStateAfterExecution: Player;
    }
  | undefined => {
  if (!ns.fileExists("Formulas.exe")) {
    ns.print("calculcateServerEffect: Formulas.exe required for this script");
    return;
  }

  // In case we have no threads that need to be run
  // just return the server as is even if its undefined.
  if (threads <= 0) {
    return event.effects;
  }
  const server =
    event.effects?.serverStateAfterExecution || ns.getServer(event.server);
  const player = event.effects?.playerStateAfterExecution || ns.getPlayer();

  if (script === hackScriptPath) {
    return {
      serverStateAfterExecution: hackEffectServer(ns, threads, server, player),
      playerStateAfterExecution: hackEffectPlayer(ns, threads, server, player),
    };
  }

  if (script === weakenScriptPath) {
    return {
      serverStateAfterExecution: weakenEffectServer(ns, threads, server),
      playerStateAfterExecution: weakenEffectPlayer(
        ns,
        threads,
        server,
        player
      ),
    };

    if (script === growScriptPath) {
      return {
        serverStateAfterExecution: growEffectServer(
          ns,
          threads,
          server,
          player
        ),
        playerStateAfterExecution: growEffectPlayer(
          ns,
          threads,
          server,
          player
        ),
      };
    }
  }

  // Fallback in case the script given couldn't be handled
  return event.effects;
};
