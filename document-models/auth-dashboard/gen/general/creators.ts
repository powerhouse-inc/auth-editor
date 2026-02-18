import { createAction } from "document-model/core";
import { SetSwitchboardUrlInputSchema } from "../schema/zod.js";
import type { SetSwitchboardUrlInput } from "../types.js";
import type { SetSwitchboardUrlAction } from "./actions.js";

export const setSwitchboardUrl = (input: SetSwitchboardUrlInput) =>
  createAction<SetSwitchboardUrlAction>(
    "SET_SWITCHBOARD_URL",
    { ...input },
    undefined,
    SetSwitchboardUrlInputSchema,
    "global",
  );
