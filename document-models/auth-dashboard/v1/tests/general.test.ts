import { generateMock } from "document-model";
import {
  isAuthDashboardDocument,
  reducer,
  setSwitchboardUrl,
  SetSwitchboardUrlInputSchema,
  utils,
} from "document-models/auth-dashboard/v1";
import { describe, expect, it } from "vitest";

describe("GeneralOperations", () => {
  it("should handle setSwitchboardUrl operation", () => {
    const document = utils.createDocument();
    const input = generateMock(SetSwitchboardUrlInputSchema());

    const updatedDocument = reducer(document, setSwitchboardUrl(input));

    expect(isAuthDashboardDocument(updatedDocument)).toBe(true);
    expect(updatedDocument.operations.global).toHaveLength(1);
    expect(updatedDocument.operations.global[0].action.type).toBe(
      "SET_SWITCHBOARD_URL",
    );
    expect(updatedDocument.operations.global[0].action.input).toStrictEqual(
      input,
    );
    expect(updatedDocument.operations.global[0].index).toEqual(0);
  });
});
