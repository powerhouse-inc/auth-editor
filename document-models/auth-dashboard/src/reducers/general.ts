import type { AuthDashboardGeneralOperations } from "../../gen/index.js";

export const authDashboardGeneralOperations: AuthDashboardGeneralOperations = {
  setSwitchboardUrlOperation(state, action) {
    state.switchboardUrl = action.input.url;
  },
};
