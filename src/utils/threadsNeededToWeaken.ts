export default (
  ns: NS,
  server: string,
  expectedSeverSecurity?: number
): number => {
  const serverMinSecurity = ns.getServerMinSecurityLevel(server);
  const serverSecurity =
    expectedSeverSecurity || ns.getServerSecurityLevel(server);

  const secDiff = serverSecurity - serverMinSecurity;
  const weakenEffect = ns.weakenAnalyze(1);
  // ns.tprint(
  //   `serverMinSecurity: ${serverMinSecurity}; serverSecurity: ${serverSecurity}; secDiff: ${secDiff}; weakenEffect: ${weakenEffect}; Math.ceil(secDiff / weakenEffect): ${Math.ceil(
  //     secDiff / weakenEffect
  //   )}`
  // );

  return Math.ceil(secDiff / weakenEffect);
};
