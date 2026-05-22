import type { DocumentModelGlobalState } from "document-model";

export const documentModel: DocumentModelGlobalState = {
  id: "powerhouse/auth-dashboard",
  name: "AuthDashboard",
  author: {
    name: "Powerhouse",
    website: "https://www.powerhouse.inc/",
  },
  extension: "",
  description:
    "Stores the switchboard API endpoint URL for an authorization permissions dashboard",
  specifications: [
    {
      state: {
        local: {
          schema: "",
          examples: [],
          initialValue: "",
        },
        global: {
          schema: "type AuthDashboardState {\n    switchboardUrl: String\n}",
          examples: [],
          initialValue: '{\n    "switchboardUrl": ""\n}',
        },
      },
      modules: [
        {
          id: "general-module-1",
          name: "general",
          description: "General operations for the auth dashboard",
          operations: [
            {
              id: "set-switchboard-url-op-1",
              name: "SET_SWITCHBOARD_URL",
              description: "Sets the switchboard API endpoint URL",
              schema: "input SetSwitchboardUrlInput {\n    url: String!\n}",
              template: "Sets the switchboard API endpoint URL",
              reducer: "state.switchboardUrl = action.input.url;",
              errors: [],
              examples: [],
              scope: "global",
            },
          ],
        },
      ],
      version: 1,
      changeLog: [],
    },
  ],
};
