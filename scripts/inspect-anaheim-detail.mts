import { getPropertyDetail } from "../server/delinquency";

const result = await getPropertyDetail({ reportingPeriodId: 60001, propertyId: 1 });
console.log(JSON.stringify({
  hasSummary: Boolean(result.summary),
  rowCount: result.rows.length,
  sourceDocumentCount: result.sourceDocuments.length,
  property: result.summary?.property ? { id: result.summary.property.id, externalId: result.summary.property.externalId, name: result.summary.property.name } : null,
}, null, 2));
