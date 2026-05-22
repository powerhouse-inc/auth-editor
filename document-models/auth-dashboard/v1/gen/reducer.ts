/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { Reducer, StateReducer } from "document-model";
import { createReducer, isDocumentAction } from "document-model";
import type { AuthDashboardPHState } from "document-models/auth-dashboard/v1";

import { authDashboardGeneralOperations } from "../src/reducers/general.js";

import { SetSwitchboardUrlInputSchema } from "./schema/zod.js";

const stateReducer: StateReducer<AuthDashboardPHState> = (
  state,
  action,
  dispatch,
) => {
  if (isDocumentAction(action)) {
    return state;
  }
  switch (action.type) {
    case "SET_SWITCHBOARD_URL": {
      SetSwitchboardUrlInputSchema().parse(action.input);

      authDashboardGeneralOperations.setSwitchboardUrlOperation(
        (state as any)[action.scope],
        action as any,
        dispatch,
      );

      break;
    }

    default:
      return state;
  }
};

export const reducer: Reducer<AuthDashboardPHState> =
  createReducer(stateReducer);
