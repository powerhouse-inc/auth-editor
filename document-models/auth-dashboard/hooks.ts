import type { DocumentDispatch } from "@powerhousedao/reactor-browser";
import {
  useDocumentById,
  useDocumentsInSelectedDrive,
  useDocumentsInSelectedFolder,
  useSelectedDocument,
} from "@powerhousedao/reactor-browser";
import type {
  AuthDashboardAction,
  AuthDashboardDocument,
} from "auth-editor/document-models/auth-dashboard";
import {
  assertIsAuthDashboardDocument,
  isAuthDashboardDocument,
} from "./gen/document-schema.js";

/** Hook to get a AuthDashboard document by its id */
export function useAuthDashboardDocumentById(
  documentId: string | null | undefined,
):
  | [AuthDashboardDocument, DocumentDispatch<AuthDashboardAction>]
  | [undefined, undefined] {
  const [document, dispatch] = useDocumentById(documentId);
  if (!isAuthDashboardDocument(document)) return [undefined, undefined];
  return [document, dispatch];
}

/** Hook to get the selected AuthDashboard document */
export function useSelectedAuthDashboardDocument(): [
  AuthDashboardDocument,
  DocumentDispatch<AuthDashboardAction>,
] {
  const [document, dispatch] = useSelectedDocument();

  assertIsAuthDashboardDocument(document);
  return [document, dispatch] as const;
}

/** Hook to get all AuthDashboard documents in the selected drive */
export function useAuthDashboardDocumentsInSelectedDrive() {
  const documentsInSelectedDrive = useDocumentsInSelectedDrive();
  return documentsInSelectedDrive?.filter(isAuthDashboardDocument);
}

/** Hook to get all AuthDashboard documents in the selected folder */
export function useAuthDashboardDocumentsInSelectedFolder() {
  const documentsInSelectedFolder = useDocumentsInSelectedFolder();
  return documentsInSelectedFolder?.filter(isAuthDashboardDocument);
}
