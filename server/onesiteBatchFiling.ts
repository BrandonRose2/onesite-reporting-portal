export const ONESITE_60001 = {
  requestId: 60001,
  reportName: "All Units (Excel)",
  completedDate: "08/28/2026",
  completedProperties: [
    "135th Street Apartments", "Anaheim Gardens", "Arbor Crest", "Bayou Pointe", "Boca Ciega Townhomes", "Breckenridge Village", "Coral Village", "Crossroads of Lees Summit", "Fairfax Sr Apartments", "Grace Townhomes", "Granite Ridge Apartments", "Grove Park Terrace", "Historical - Riverchase Homes", "Holiday Apartments", "Howell Place", "Jefferson Arms Apts", "Lexington Arms", "Macedonia Gardens", "Marrero 3 LP", "Midtown Manor", "New Wilmington Arms", "North Pointe", "Pacific Pointe Apartments", "Pelican Bay", "Pirates Bend", "Silver Springs Terrace", "St. Charles", "Thomasville Church Homes", "Walnut Hill", "Windsor Village", "Yorkshire Apartments",
  ] as const,
  inProgressProperties: ["Cumberland Apartments", "Urban Rehab"] as const,
  erroredProperties: ["Granite Elmwood Indiana Homes", "Granite Valencia Villas"] as const,
} as const;

export type BatchDocument = { propertyName: string; documentKind: "source_report" | "property_workbook" | "workbook_html" | "manager_checklist"; originalFilename: string };

export function getOneSite60001FilingPlan(documents: BatchDocument[]) {
  const documentKinds = new Map<string, Set<BatchDocument["documentKind"]>>();
  for (const document of documents) {
    const kinds = documentKinds.get(document.propertyName) ?? new Set<BatchDocument["documentKind"]>();
    kinds.add(document.documentKind);
    documentKinds.set(document.propertyName, kinds);
  }
  const incompletePairs = ONESITE_60001.completedProperties.filter(propertyName => {
    const kinds = documentKinds.get(propertyName);
    return Boolean(kinds?.has("source_report")) !== Boolean(kinds?.has("workbook_html"));
  });
  if (incompletePairs.length) throw new Error(`Request #60001 has incomplete original/HTML document pairs for ${incompletePairs.join(", ")}. Resolve them before uploading more workbooks.`);
  const alreadyFiled = ONESITE_60001.completedProperties.filter(propertyName => documentKinds.get(propertyName)?.has("source_report"));
  const pendingFiling = ONESITE_60001.completedProperties.filter(propertyName => !documentKinds.get(propertyName)?.has("source_report"));
  return {
    requestId: ONESITE_60001.requestId,
    reportName: ONESITE_60001.reportName,
    completedDate: ONESITE_60001.completedDate,
    completedCount: ONESITE_60001.completedProperties.length,
    alreadyFiled,
    pendingFiling,
    inProgress: [...ONESITE_60001.inProgressProperties],
    errored: [...ONESITE_60001.erroredProperties],
  };
}

