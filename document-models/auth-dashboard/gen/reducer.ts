// TODO: remove eslint-disable rules once refactor is done
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { StateReducer } from "document-model";
import { isDocumentAction, createReducer } from "document-model/core";
import type { AuthDashboardPHState } from "@powerhousedao/auth-editor/document-models/auth-dashboard";

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

export const reducer = createReducer<AuthDashboardPHState>(stateReducer);
