import type { EditorModule } from "document-model";
import { lazy } from "react";

/** Document editor module for the "["powerhouse/auth-dashboard"]" document type */
export const AuthDashboardEditor: EditorModule = {
  Component: lazy(() => import("./editor.js")),
  documentTypes: ["powerhouse/auth-dashboard"],
  config: {
    id: "auth-dashboard-editor",
    name: "AuthDashboardEditor",
  },
};
