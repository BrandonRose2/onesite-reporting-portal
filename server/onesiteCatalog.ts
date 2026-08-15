import { createHash } from "node:crypto";

export type OneSiteCatalogSeed = {
  slug: string;
  displayName: string;
  exactReportName: string;
  searchTerm: string;
  defaultFormat: "excel" | "pdf" | "csv";
  reportArea: string | null;
  reportLevel: string | null;
  product: string | null;
  isVerified: boolean;
  description: string;
};

export type OneSiteDiscoveredReport = {
  title: string;
  reportArea?: string | null;
  reportLevel?: string | null;
  product?: string | null;
};

const VERIFIED_SLUGS: Record<string, string> = {
  Availability: "availability-pdf",
  "Delinquent and Prepaid (Excel)": "delinquent-and-prepaid-excel",
};

function portalDisplayName(title: string) {
  return title === "Delinquent and Prepaid (Excel)" ? "Delinquency (Current Residents)" : title;
}

function slugify(title: string) {
  const normalized = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const base = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 110) || "onesite-report";
  return base;
}

function defaultFormat(title: string): "excel" | "pdf" | "csv" {
  const normalized = title.toLowerCase();
  if (normalized.includes("(excel)") || normalized.endsWith(" excel")) return "excel";
  if (normalized.includes("(csv)") || normalized.endsWith(" csv")) return "csv";
  return "pdf";
}

function normalizedInput(input: string | OneSiteDiscoveredReport): Required<OneSiteDiscoveredReport> {
  if (typeof input === "string") return { title: input.trim(), reportArea: "", reportLevel: "", product: "" };
  return { title: input.title.trim(), reportArea: input.reportArea?.trim() ?? "", reportLevel: input.reportLevel?.trim() ?? "", product: input.product?.trim() ?? "" };
}

export function buildOneSiteCatalogSeeds(rawReports: Array<string | OneSiteDiscoveredReport>): OneSiteCatalogSeed[] {
  const inputs = rawReports.map(normalizedInput).filter(report => report.title);
  const titleCounts = new Map<string, number>();
  for (const input of inputs) titleCounts.set(input.title, (titleCounts.get(input.title) ?? 0) + 1);
  const seenRows = new Set<string>();
  const usedSlugs = new Set<string>();
  return inputs.flatMap(input => {
    const { title, reportArea, reportLevel, product } = input;
    const rowKey = [title, reportArea, reportLevel, product].join("\u001f");
    if (seenRows.has(rowKey)) return [];
    seenRows.add(rowKey);
    const baseSlug = VERIFIED_SLUGS[title] ?? slugify(title);
    let slug = baseSlug;
    const isDuplicateTitle = (titleCounts.get(title) ?? 0) > 1;
    if (isDuplicateTitle && usedSlugs.has(slug)) slug = `${baseSlug}-${slugify(reportArea || "area")}-${slugify(reportLevel || "level")}-${slugify(product || "product")}`.slice(0, 120);
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
    usedSlugs.add(slug);
    const isVerified = Boolean(VERIFIED_SLUGS[title]);
    const metadataLabel = [reportArea, reportLevel, product].filter(Boolean).join(" · ");
    return [{
      slug,
      displayName: isDuplicateTitle && metadataLabel ? `${portalDisplayName(title)} — ${metadataLabel}`.slice(0, 255) : portalDisplayName(title),
      exactReportName: title,
      searchTerm: title.slice(0, 160),
      defaultFormat: defaultFormat(title),
      reportArea: reportArea || null,
      reportLevel: reportLevel || null,
      product: product || null,
      isVerified,
      description: isVerified
        ? "Verified against the authenticated OneSite Reports catalog."
        : "Discovered from the authenticated OneSite Reports catalog; export format should be confirmed when first run.",
    }];
  });
}

export function catalogFingerprint(reports: Array<string | OneSiteDiscoveredReport>) {
  return createHash("sha256").update(buildOneSiteCatalogSeeds(reports).map(entry => [entry.exactReportName, entry.reportArea, entry.reportLevel, entry.product].join("\u001f")).join("\n")).digest("hex");
}
