export default {
  timeouts: {
    skip: 1,
    veryShort: 50,
    short: 100,
    medium: 1000,
    long: 5000,
    veryLong: 10000,
  },
  scriptPaths: {
    growScriptPath: "/serverScripts/grow.js",
    weakenScriptPath: "/serverScripts/weaken.js",
    hackScriptPath: "/serverScripts/hack.js",
    preparingToUpgradeScriptPath: "/serverScripts/preparing-to-upgrade.js",
    gangs: {
      manage: "/gangs/manage.js",
      recruit: "/gangs/recruit.js",
    },
  },
  namingConventions: {
    ghostServersPrefix: "ghost",
    gangMember: "banger",
  },
  bitburner: {
    growThreadSecurityIncrease: 0.004,
    weakenThreadSecurityDecrease: 0.05,
  },
};
