export const knownOperationalLimitations = [
  "My Reports discovery remains intentionally unverified. The runner records a warning instead of treating discovered output as downloaded files.",
  "Runner and RealPage credentials must remain outside portal source code and database records.",
  "Runner validation should begin with health checks and a live Edge session check before a production request is claimed.",
] as const;

