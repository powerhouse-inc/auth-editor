import type { DocumentModelModule } from "document-model";
import { createState } from "document-model";
import { defaultBaseState } from "document-model/core";
import type { AuthDashboardPHState } from "./gen/index.js";
import { generalActions, documentModel, reducer, utils } from "./gen/index.js";

/** Document model module for the AuthDashboard document type */
export const AuthDashboard: DocumentModelModule<AuthDashboardPHState> = {
  version: 1,
  reducer,
  actions: { ...generalActions },
  utils,
  documentModel: createState(defaultBaseState(), documentModel),
};
