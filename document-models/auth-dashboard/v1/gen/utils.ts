/**
 * WARNING: DO NOT EDIT
 * This file is auto-generated and updated by codegen
 */
import type { DocumentModelUtils } from "document-model";
import {
  baseCreateDocument,
  baseLoadFromInput,
  baseSaveToFileHandle,
  defaultBaseState,
  generateId,
} from "document-model";
import {
  assertIsAuthDashboardDocument,
  assertIsAuthDashboardState,
  isAuthDashboardDocument,
  isAuthDashboardState,
} from "./document-schema.js";
import { authDashboardDocumentType } from "./document-type.js";
import { reducer } from "./reducer.js";
import type {
  AuthDashboardGlobalState,
  AuthDashboardLocalState,
  AuthDashboardPHState,
} from "./types.js";

export const initialGlobalState: AuthDashboardGlobalState = {
  switchboardUrl: "",
};
export const initialLocalState: AuthDashboardLocalState = {};

export const utils: DocumentModelUtils<AuthDashboardPHState> = {
  fileExtension: "",
  createState(state) {
    return {
      ...defaultBaseState(),
      global: { ...initialGlobalState, ...state?.global },
      local: { ...initialLocalState, ...state?.local },
    };
  },
  createDocument(state) {
    const document = baseCreateDocument(utils.createState, state);

    document.header.documentType = authDashboardDocumentType;

    // for backwards compatibility, but this is NOT a valid signed document id
    document.header.id = generateId();

    return document;
  },
  saveToFileHandle(document, input) {
    return baseSaveToFileHandle(document, input);
  },
  loadFromInput(input) {
    return baseLoadFromInput(input, reducer);
  },
  isStateOfType(state) {
    return isAuthDashboardState(state);
  },
  assertIsStateOfType(state) {
    return assertIsAuthDashboardState(state);
  },
  isDocumentOfType(document) {
    return isAuthDashboardDocument(document);
  },
  assertIsDocumentOfType(document) {
    return assertIsAuthDashboardDocument(document);
  },
};
