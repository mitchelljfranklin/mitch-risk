import { describe, expect, it } from "vitest";

import { vendorCsvRowSchema } from "@/lib/schemas/vendor";

function parseRow(row: Record<string, unknown>) {
  const result = vendorCsvRowSchema.safeParse(row);
  if (!result.success) throw new Error("expected row to parse");
  return result.data;
}

describe("vendorCsvRowSchema new columns", () => {
  it("normalises a valid data sensitivity to upper case", () => {
    const data = parseRow({
      name: "Acme",
      contactEmail: "a@example.test",
      dataSensitivity: "confidential",
    });
    expect(data.dataSensitivity).toBe("CONFIDENTIAL");
  });

  it("drops an invalid data sensitivity", () => {
    const data = parseRow({
      name: "Acme",
      contactEmail: "a@example.test",
      dataSensitivity: "top-secret",
    });
    expect(data.dataSensitivity).toBe("");
  });

  it("keeps a valid contract renewal date and drops an invalid one", () => {
    expect(
      parseRow({
        name: "Acme",
        contactEmail: "a@example.test",
        contractRenewalDate: "2027-01-15",
      }).contractRenewalDate,
    ).toBe("2027-01-15");
    expect(
      parseRow({
        name: "Acme",
        contactEmail: "a@example.test",
        contractRenewalDate: "not-a-date",
      }).contractRenewalDate,
    ).toBe("");
  });

  it("passes the service description through", () => {
    expect(
      parseRow({
        name: "Acme",
        contactEmail: "a@example.test",
        serviceDescription: "Cloud email hosting",
      }).serviceDescription,
    ).toBe("Cloud email hosting");
  });

  it("passes the external ID through", () => {
    expect(
      parseRow({
        name: "Acme",
        contactEmail: "a@example.test",
        externalId: "ERP-V-001",
      }).externalId,
    ).toBe("ERP-V-001");
  });

  it("defaults the external ID to empty when absent", () => {
    expect(
      parseRow({
        name: "Acme",
        contactEmail: "a@example.test",
      }).externalId,
    ).toBe("");
  });
});
