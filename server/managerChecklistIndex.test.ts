import { describe, expect, it } from "vitest";
import { managerChecklistPackageByExternalId } from "../client/src/pages/ManagerChecklists";

const readmePropertyIds = [
  "1181003", "1181004", "1181005", "1181006", "1482145", "2312055", "2432257", "2836023", "2934332",
  "3073874", "3156041", "3835626", "3927823", "3927824", "3990059", "3990061", "4022593", "4160082",
  "4233753", "4233754", "4276597", "4304099", "4371422", "4573141", "4679872", "4859069", "4992471",
  "5083727", "5159418", "5204960", "5313974", "5313976", "5313977", "5414947", "5661023",
].sort();

describe("manager checklist README index", () => {
  it("contains every one of the 35 README properties with its availability source filename", () => {
    const configuredIds = Object.keys(managerChecklistPackageByExternalId).sort();
    expect(configuredIds).toEqual(readmePropertyIds);
    expect(configuredIds).toHaveLength(35);

    configuredIds.forEach(externalId => {
      const packageEntry = managerChecklistPackageByExternalId[externalId];
      expect(packageEntry.availabilityFilename).toMatch(new RegExp(`^${externalId}_`));
      expect(packageEntry.availabilityFilename).toMatch(/_Availability_\d+\.pdf$/);
      expect(packageEntry.delinquencyExportCount).toBe(2);
    });
  });
});
