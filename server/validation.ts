import { z } from "zod";

export const reportFormatSchema = z.enum(["excel", "pdf", "csv"]);
export const requestTypeSchema = z.enum(["generate_all_properties", "generate_property", "sync_my_reports"]);
export const runnerSourceSchema = z.enum(["onesite", "yardi"]);
export const metadataSchema = z.record(z.string(), z.unknown());

export const propertySaveSchema = z.object({
  id: z.number().int().positive().optional(),
  source: runnerSourceSchema.default("onesite"),
  externalId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(255),
  market: z.string().trim().max(128).nullable().optional(),
  managerName: z.string().trim().max(255).nullable().optional(),
  managerEmail: z.string().trim().email().max(320).nullable().optional(),
  active: z.boolean(),
});

export const catalogSaveSchema = z.object({
  id: z.number().int().positive().optional(),
  source: runnerSourceSchema.default("onesite"),
  catalogKey: z.string().trim().min(1).max(160),
  exactReportName: z.string().trim().min(1).max(255),
  reportArea: z.string().trim().max(128).nullable().optional(),
  reportLevel: z.string().trim().max(128).nullable().optional(),
  product: z.string().trim().max(128).nullable().optional(),
  availableFormats: z.array(reportFormatSchema).min(1),
  runnerMetadata: metadataSchema,
  active: z.boolean(),
});

export const requestCreateSchema = z.object({
  source: runnerSourceSchema.default("onesite"),
  requestType: requestTypeSchema,
  catalogId: z.number().int().positive().optional(),
  requestedReportName: z.string().trim().min(1).max(255),
  requestedFormat: reportFormatSchema,
  parameters: metadataSchema,
  propertyId: z.number().int().positive().optional(),
  executionAuthorized: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.requestType === "generate_property" && !value.propertyId) {
    context.addIssue({ code: "custom", message: "A property is required for a single-property request.", path: ["propertyId"] });
  }
  if (value.requestType !== "generate_property" && value.propertyId) {
    context.addIssue({ code: "custom", message: "A property can only be selected for a single-property request.", path: ["propertyId"] });
  }
  if (value.requestType !== "sync_my_reports" && !value.catalogId) {
    context.addIssue({ code: "custom", message: "An approved catalog report is required.", path: ["catalogId"] });
  }
});

export const reportUserDefaultsSaveSchema = z.object({
  source: runnerSourceSchema,
  catalogId: z.number().int().positive(),
  requestedFormat: reportFormatSchema,
  parameters: metadataSchema,
});
