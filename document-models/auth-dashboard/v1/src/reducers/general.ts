import type { AuthDashboardGeneralOperations } from "document-models/auth-dashboard/v1";

export const authDashboardGeneralOperations: AuthDashboardGeneralOperations = {
  setSwitchboardUrlOperation(state, action) {
    state.switchboardUrl = action.input.url;
  },
};
