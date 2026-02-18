import { type SignalDispatch } from "document-model";
import type { SetSwitchboardUrlAction } from "./actions.js";
import type { AuthDashboardState } from "../types.js";

export interface AuthDashboardGeneralOperations {
  setSwitchboardUrlOperation: (
    state: AuthDashboardState,
    action: SetSwitchboardUrlAction,
    dispatch?: SignalDispatch,
  ) => void;
}
