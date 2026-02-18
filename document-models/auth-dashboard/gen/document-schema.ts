import {
  BaseDocumentHeaderSchema,
  BaseDocumentStateSchema,
} from "document-model";
import { z } from "zod";
import { authDashboardDocumentType } from "./document-type.js";
import { AuthDashboardStateSchema } from "./schema/zod.js";
import type { AuthDashboardDocument, AuthDashboardPHState } from "./types.js";

/** Schema for validating the header object of a AuthDashboard document */
export const AuthDashboardDocumentHeaderSchema =
  BaseDocumentHeaderSchema.extend({
    documentType: z.literal(authDashboardDocumentType),
  });

/** Schema for validating the state object of a AuthDashboard document */
export const AuthDashboardPHStateSchema = BaseDocumentStateSchema.extend({
  global: AuthDashboardStateSchema(),
});

export const AuthDashboardDocumentSchema = z.object({
  header: AuthDashboardDocumentHeaderSchema,
  state: AuthDashboardPHStateSchema,
  initialState: AuthDashboardPHStateSchema,
});

/** Simple helper function to check if a state object is a AuthDashboard document state object */
export function isAuthDashboardState(
  state: unknown,
): state is AuthDashboardPHState {
  return AuthDashboardPHStateSchema.safeParse(state).success;
}

/** Simple helper function to assert that a document state object is a AuthDashboard document state object */
export function assertIsAuthDashboardState(
  state: unknown,
): asserts state is AuthDashboardPHState {
  AuthDashboardPHStateSchema.parse(state);
}

/** Simple helper function to check if a document is a AuthDashboard document */
export function isAuthDashboardDocument(
  document: unknown,
): document is AuthDashboardDocument {
  return AuthDashboardDocumentSchema.safeParse(document).success;
}

/** Simple helper function to assert that a document is a AuthDashboard document */
export function assertIsAuthDashboardDocument(
  document: unknown,
): asserts document is AuthDashboardDocument {
  AuthDashboardDocumentSchema.parse(document);
}
