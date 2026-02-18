import type { AuthDashboardGeneralOperations } from "auth-editor/document-models/auth-dashboard";

export const authDashboardGeneralOperations: AuthDashboardGeneralOperations = {
  setSwitchboardUrlOperation(state, action) {
    state.switchboardUrl = action.input.url;
  },
};
