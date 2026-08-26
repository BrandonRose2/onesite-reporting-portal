import { describe, expect, it } from "vitest";
import { catalogSaveSchema, propertySaveSchema, requestCreateSchema } from "./validation";

describe("portal input validation", () => {
  it("rejects property records without runner-safe identifiers", () => {
    expect(propertySaveSchema.safeParse({ externalId: "", name: "Northpoint", active: true }).success).toBe(false);
    expect(propertySaveSchema.safeParse({ externalId: "prop-101", name: "Northpoint", managerEmail: "not-an-email", active: true }).success).toBe(false);
  });

  it("requires exact catalog metadata and a supported format", () => {
    expect(catalogSaveSchema.safeParse({ catalogKey: "", exactReportName: "Delinquency", availableFormats: ["excel"], runnerMetadata: {}, active: true }).success).toBe(false);
    expect(catalogSaveSchema.safeParse({ catalogKey: "deli", exactReportName: "Delinquency", availableFormats: [], runnerMetadata: {}, active: true }).success).toBe(false);
  });

  it("requires a property only for a single-property request", () => {
    expect(requestCreateSchema.safeParse({ requestType: "generate_property", requestedReportName: "Delinquency", requestedFormat: "excel", parameters: {} }).success).toBe(false);
    expect(requestCreateSchema.safeParse({ requestType: "generate_all_properties", requestedReportName: "Delinquency", requestedFormat: "excel", propertyId: 3, parameters: {} }).success).toBe(false);
    expect(requestCreateSchema.safeParse({ requestType: "generate_property", catalogId: 12, requestedReportName: "Delinquency", requestedFormat: "excel", propertyId: 3, parameters: {} }).success).toBe(true);
  });
});
