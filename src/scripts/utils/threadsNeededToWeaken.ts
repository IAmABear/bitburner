export default (ns: NS, server: string): number => {
  const serverMinSecurity = ns.getServerMinSecurityLevel(server);
  const serverSecurity = ns.getServerSecurityLevel(server);
  const secDiff = serverSecurity - serverMinSecurity;
  const weakenEffect = ns.weakenAnalyze(1);

  return Math.ceil(secDiff / weakenEffect);
};
