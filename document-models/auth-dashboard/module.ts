import type { DocumentModelModule } from "document-model";
import { createState } from "document-model";
import { defaultBaseState } from "document-model/core";
import type { AuthDashboardPHState } from "@powerhousedao/auth-editor/document-models/auth-dashboard";
import {
  actions,
  documentModel,
  reducer,
  utils,
} from "@powerhousedao/auth-editor/document-models/auth-dashboard";

/** Document model module for the AuthDashboard document type */
export const AuthDashboard: DocumentModelModule<AuthDashboardPHState> = {
  version: 1,
  reducer,
  actions,
  utils,
  documentModel: createState(defaultBaseState(), documentModel),
};
