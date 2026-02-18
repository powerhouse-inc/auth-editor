/**
 * This is a scaffold file meant for customization:
 * - change it by adding new tests or modifying the existing ones
 */
/**
 * This is a scaffold file meant for customization:
 * - change it by adding new tests or modifying the existing ones
 */

import { describe, it, expect } from "vitest";
import {
  utils,
  initialGlobalState,
  initialLocalState,
  authDashboardDocumentType,
  isAuthDashboardDocument,
  assertIsAuthDashboardDocument,
  isAuthDashboardState,
  assertIsAuthDashboardState,
} from "../index.js";
import { ZodError } from "zod";

describe("AuthDashboard Document Model", () => {
  it("should create a new AuthDashboard document", () => {
    const document = utils.createDocument();

    expect(document).toBeDefined();
    expect(document.header.documentType).toBe(authDashboardDocumentType);
  });

  it("should create a new AuthDashboard document with a valid initial state", () => {
    const document = utils.createDocument();
    expect(document.state.global).toStrictEqual(initialGlobalState);
    expect(document.state.local).toStrictEqual(initialLocalState);
    expect(isAuthDashboardDocument(document)).toBe(true);
    expect(isAuthDashboardState(document.state)).toBe(true);
  });
  it("should reject a document that is not a AuthDashboard document", () => {
    const wrongDocumentType = utils.createDocument();
    wrongDocumentType.header.documentType = "the-wrong-thing-1234";
    expect(isAuthDashboardDocument(wrongDocumentType)).toBe(false);
    expect(() => assertIsAuthDashboardDocument(wrongDocumentType)).toThrow(
      ZodError,
    );
  });

  it("should reject a document with invalid global state", () => {
    const wrongState = utils.createDocument();
    // switchboardUrl must be string | null | undefined, not number
    // @ts-expect-error - we are testing the error case
    wrongState.state.global = { switchboardUrl: 123 };
    expect(isAuthDashboardState(wrongState.state)).toBe(false);
    expect(() => assertIsAuthDashboardState(wrongState.state)).toThrow(
      ZodError,
    );
    expect(isAuthDashboardDocument(wrongState)).toBe(false);
    expect(() => assertIsAuthDashboardDocument(wrongState)).toThrow(ZodError);
  });

  it("should reject a document with invalid initialState", () => {
    const wrongInitialState = utils.createDocument();
    const invalidGlobal = { switchboardUrl: 123 };
    // @ts-expect-error - we are testing the error case
    wrongInitialState.initialState.global = invalidGlobal;
    // @ts-expect-error - we are testing the error case
    wrongInitialState.state.global = invalidGlobal;
    expect(isAuthDashboardState(wrongInitialState.state)).toBe(false);
    expect(() => assertIsAuthDashboardState(wrongInitialState.state)).toThrow(
      ZodError,
    );
    expect(isAuthDashboardDocument(wrongInitialState)).toBe(false);
    expect(() => assertIsAuthDashboardDocument(wrongInitialState)).toThrow(
      ZodError,
    );
  });

  it("should reject a document with missing header id", () => {
    const missingIdInHeader = utils.createDocument();
    // @ts-expect-error - we are testing the error case
    delete missingIdInHeader.header.id;
    expect(isAuthDashboardDocument(missingIdInHeader)).toBe(false);
    expect(() => assertIsAuthDashboardDocument(missingIdInHeader)).toThrow(
      ZodError,
    );
  });

  it("should reject a document with missing header name", () => {
    const missingNameInHeader = utils.createDocument();
    // @ts-expect-error - we are testing the error case
    delete missingNameInHeader.header.name;
    expect(isAuthDashboardDocument(missingNameInHeader)).toBe(false);
    expect(() => assertIsAuthDashboardDocument(missingNameInHeader)).toThrow(
      ZodError,
    );
  });

  it("should reject a document with missing header createdAtUtcIso", () => {
    const missingCreatedAtUtcIsoInHeader = utils.createDocument();
    // @ts-expect-error - we are testing the error case
    delete missingCreatedAtUtcIsoInHeader.header.createdAtUtcIso;
    expect(isAuthDashboardDocument(missingCreatedAtUtcIsoInHeader)).toBe(false);
    expect(() =>
      assertIsAuthDashboardDocument(missingCreatedAtUtcIsoInHeader),
    ).toThrow(ZodError);
  });

  it("should reject a document with missing header lastModifiedAtUtcIso", () => {
    const missingLastModifiedAtUtcIsoInHeader = utils.createDocument();
    // @ts-expect-error - we are testing the error case
    delete missingLastModifiedAtUtcIsoInHeader.header.lastModifiedAtUtcIso;
    expect(isAuthDashboardDocument(missingLastModifiedAtUtcIsoInHeader)).toBe(
      false,
    );
    expect(() =>
      assertIsAuthDashboardDocument(missingLastModifiedAtUtcIsoInHeader),
    ).toThrow(ZodError);
  });
});
