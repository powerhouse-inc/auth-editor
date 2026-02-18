import type { DocumentModelUtils } from "document-model";
import {
  baseCreateDocument,
  baseSaveToFileHandle,
  baseLoadFromInput,
  defaultBaseState,
  generateId,
} from "document-model/core";
import type {
  AuthDashboardGlobalState,
  AuthDashboardLocalState,
} from "./types.js";
import type { AuthDashboardPHState } from "./types.js";
import { reducer } from "./reducer.js";
import { authDashboardDocumentType } from "./document-type.js";
import {
  isAuthDashboardDocument,
  assertIsAuthDashboardDocument,
  isAuthDashboardState,
  assertIsAuthDashboardState,
} from "./document-schema.js";

export const initialGlobalState: AuthDashboardGlobalState = {
  switchboardUrl: "",
};
export const initialLocalState: AuthDashboardLocalState = {};

export const utils: DocumentModelUtils<AuthDashboardPHState> = {
  fileExtension: "phad",
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

export const createDocument = utils.createDocument;
export const createState = utils.createState;
export const saveToFileHandle = utils.saveToFileHandle;
export const loadFromInput = utils.loadFromInput;
export const isStateOfType = utils.isStateOfType;
export const assertIsStateOfType = utils.assertIsStateOfType;
export const isDocumentOfType = utils.isDocumentOfType;
export const assertIsDocumentOfType = utils.assertIsDocumentOfType;
