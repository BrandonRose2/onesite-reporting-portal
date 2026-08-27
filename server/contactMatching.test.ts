import { describe, expect, it } from "vitest";
import { matchManagerContacts, normalizeNotionContactRows } from "./contactMatching";

describe("Notion manager contact matching", () => {
  const contacts = normalizeNotionContactRows([
    { Property: "North Pointe Apts", Manager: "Property Lead", "Email Address": "lead@example.com", Office: "(555) 555-0100", Mobile: "(555) 555-0101", Ext: "230", Region: "Region 3", "Regional Manager": "__NO__" },
    { Record: "Regional Lead - Regional Manager", Property: null, Manager: null, "Email Address": "regional@example.com", Office: "(555) 555-0200", Ext: "301", Region: "Region 3", "Regional Manager": "__YES__" },
  ]);

  it("matches property and regional recipients using approved Notion fields", () => {
    const match = matchManagerContacts("North Pointe", contacts);
    expect(match.propertyContacts[0]).toMatchObject({ managerName: "Property Lead", email: "lead@example.com", officePhone: "(555) 555-0100", mobilePhone: "(555) 555-0101", phoneExtension: "230" });
    expect(match.regionalContacts[0]).toMatchObject({ managerName: null, recordName: "Regional Lead - Regional Manager", email: "regional@example.com", officePhone: "(555) 555-0200", phoneExtension: "301" });
  });

  it("returns an explicit empty match when the property is not represented", () => {
    expect(matchManagerContacts("Unknown Property", contacts)).toMatchObject({ propertyContacts: [], regionalContacts: [], matchedRegion: null });
  });
});
