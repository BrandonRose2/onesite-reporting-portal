export type ManagerContactMatch = {
  propertyContacts: Array<{ propertyName: string | null; managerName: string | null; email: string | null; region: string | null; isRegionalManager: boolean }>;
  regionalContacts: Array<{ propertyName: string | null; managerName: string | null; email: string | null; region: string | null; isRegionalManager: boolean }>;
  matchedRegion: string | null;
};
