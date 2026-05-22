/**
 * WARNING: DO NOT EDIT
 * This file is auto-generated and updated by codegen
 * Factory methods for creating AuthDashboardDocument instances
 */
import type { PHAuthState, PHBaseState, PHDocumentState } from "document-model";
import { createBaseState, defaultBaseState } from "document-model";
import type {
  AuthDashboardDocument,
  AuthDashboardGlobalState,
  AuthDashboardLocalState,
  AuthDashboardPHState,
} from "./types.js";
import { utils } from "./utils.js";

export function defaultGlobalState(): AuthDashboardGlobalState {
  return {
    switchboardUrl: "",
  };
}

export function defaultLocalState(): AuthDashboardLocalState {
  return {};
}

export function defaultPHState(): AuthDashboardPHState {
  return {
    ...defaultBaseState(),
    global: defaultGlobalState(),
    local: defaultLocalState(),
  };
}

export function createGlobalState(
  state?: Partial<AuthDashboardGlobalState>,
): AuthDashboardGlobalState {
  return {
    ...defaultGlobalState(),
    ...(state || {}),
  };
}

export function createLocalState(
  state?: Partial<AuthDashboardLocalState>,
): AuthDashboardLocalState {
  return {
    ...defaultLocalState(),
    ...(state || {}),
  } as AuthDashboardLocalState;
}

export function createState(
  baseState?: Partial<PHBaseState>,
  globalState?: Partial<AuthDashboardGlobalState>,
  localState?: Partial<AuthDashboardLocalState>,
): AuthDashboardPHState {
  return {
    ...createBaseState(baseState?.auth, baseState?.document),
    global: createGlobalState(globalState),
    local: createLocalState(localState),
  };
}

/**
 * Creates a AuthDashboardDocument with custom global and local state
 * This properly handles the PHBaseState requirements while allowing
 * document-specific state to be set.
 */
export function createAuthDashboardDocument(
  state?: Partial<{
    auth?: Partial<PHAuthState>;
    document?: Partial<PHDocumentState>;
    global?: Partial<AuthDashboardGlobalState>;
    local?: Partial<AuthDashboardLocalState>;
  }>,
): AuthDashboardDocument {
  const document = utils.createDocument(
    state
      ? createState(
          createBaseState(state.auth, state.document),
          state.global,
          state.local,
        )
      : undefined,
  );

  return document;
}
