import { baseActions } from "document-model";
import { generalActions } from "./gen/creators.js";

/** Actions for the AuthDashboard document model */

export const actions = { ...baseActions, ...generalActions };
