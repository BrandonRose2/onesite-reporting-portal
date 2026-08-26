import { z } from "zod";

const parameterTypeSchema = z.enum(["text", "number", "select", "boolean", "date"]);
export const parameterDefinitionSchema = z.object({
  key: z.string().trim().min(1).max(96).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Use letters, numbers, and underscores only."),
  label: z.string().trim().min(1).max(160),
  type: parameterTypeSchema,
  required: z.boolean().optional().default(false),
  description: z.string().trim().max(320).optional(),
  options: z.array(z.object({ label: z.string().trim().min(1).max(160), value: z.string().trim().min(1).max(160) })).max(100).optional(),
  defaultValue: z.union([z.string().max(320), z.number(), z.boolean()]).optional(),
}).superRefine((definition, context) => {
  if (definition.type === "select" && !definition.options?.length) context.addIssue({ code: "custom", message: "Select parameters require options.", path: ["options"] });
  if (definition.type !== "select" && definition.options?.length) context.addIssue({ code: "custom", message: "Only select parameters can have options.", path: ["options"] });
});

export type CatalogParameterDefinition = z.infer<typeof parameterDefinitionSchema>;
const sensitiveKeyPattern = /(password|passcode|cookie|credential|token|secret|authorization|session)/i;

export function getCatalogParameterDefinitions(runnerMetadata: Record<string, unknown>): CatalogParameterDefinition[] {
  const raw = runnerMetadata.parameterDefinitions;
  if (!Array.isArray(raw)) return [];
  return raw.map(item => parameterDefinitionSchema.safeParse(item)).filter((result): result is { success: true; data: CatalogParameterDefinition } => result.success).map(result => result.data).filter(definition => !sensitiveKeyPattern.test(definition.key));
}

export function validateCatalogParameterValues(definitions: CatalogParameterDefinition[], values: Record<string, unknown>) {
  const errors: string[] = [];
  const definitionsByKey = new Map(definitions.map(definition => [definition.key, definition]));
  Object.keys(values).forEach(key => {
    if (!definitionsByKey.has(key)) errors.push(`Unsupported report parameter: ${key}.`);
    if (sensitiveKeyPattern.test(key)) errors.push("Credential, token, and cookie parameters are not permitted.");
  });
  definitions.forEach(definition => {
    const value = values[definition.key];
    if (definition.required && (value === undefined || value === null || value === "")) errors.push(`${definition.label} is required.`);
    if (value === undefined || value === null || value === "") return;
    if (definition.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) errors.push(`${definition.label} must be a number.`);
    if (definition.type === "boolean" && typeof value !== "boolean") errors.push(`${definition.label} must be true or false.`);
    if (["text", "select", "date"].includes(definition.type) && typeof value !== "string") errors.push(`${definition.label} must be text.`);
    if (definition.type === "select" && typeof value === "string" && !definition.options?.some(option => option.value === value)) errors.push(`${definition.label} must use an approved option.`);
    if (definition.type === "date" && typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${definition.label} must use YYYY-MM-DD format.`);
  });
  return errors;
}
