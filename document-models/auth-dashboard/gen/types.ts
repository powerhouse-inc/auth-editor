import type { PHDocument, PHBaseState } from "document-model";
import type { AuthDashboardAction } from "./actions.js";
import type { AuthDashboardState as AuthDashboardGlobalState } from "./schema/types.js";

type AuthDashboardLocalState = Record<PropertyKey, never>;

type AuthDashboardPHState = PHBaseState & {
  global: AuthDashboardGlobalState;
  local: AuthDashboardLocalState;
};
type AuthDashboardDocument = PHDocument<AuthDashboardPHState>;

export * from "./schema/types.js";

export type {
  AuthDashboardGlobalState,
  AuthDashboardLocalState,
  AuthDashboardPHState,
  AuthDashboardAction,
  AuthDashboardDocument,
};
