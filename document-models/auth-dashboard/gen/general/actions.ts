import type { Action } from "document-model";
import type { SetSwitchboardUrlInput } from "../types.js";

export type SetSwitchboardUrlAction = Action & {
  type: "SET_SWITCHBOARD_URL";
  input: SetSwitchboardUrlInput;
};

export type AuthDashboardGeneralAction = SetSwitchboardUrlAction;
