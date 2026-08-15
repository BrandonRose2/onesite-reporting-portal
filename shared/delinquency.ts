export const REGIONS = ["Region 1", "Region 2", "Region 3", "Region 4"] as const;

export type RegionName = (typeof REGIONS)[number];

export type DelinquencyMetrics = {
  residentCount: number;
  delinquentUnits: number;
  netDelinquent: number;
  netBalance: number;
  currentAmount: number;
  days30Amount: number;
  days60Amount: number;
  days90PlusAmount: number;
};

export const emptyMetrics = (): DelinquencyMetrics => ({
  residentCount: 0,
  delinquentUnits: 0,
  netDelinquent: 0,
  netBalance: 0,
  currentAmount: 0,
  days30Amount: 0,
  days60Amount: 0,
  days90PlusAmount: 0,
});
