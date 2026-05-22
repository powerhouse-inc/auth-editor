import { useCallback } from "react";
import { useRenown, useUser } from "@powerhousedao/reactor-browser";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Hook for making authenticated GraphQL requests to the switchboard.
 *
 * Auth tokens are obtained automatically from Connect's Renown login
 * via useRenown().getBearerToken(). In production, Connect and the
 * reactor share the same origin so CORS is not an issue.
 */
export function useAuthApi(switchboardUrl: string | null | undefined) {
  const renown = useRenown();
  const user = useUser();

  const query = useCallback(
    async <T>(gql: string, variables?: Record<string, unknown>): Promise<T> => {
      if (!switchboardUrl) throw new Error("No switchboard URL configured");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (renown && user?.address) {
        try {
          // Mint a bearer WITHOUT `aud`. The switchboard's JWT verifier
          // (did-jwt) rejects any token that has an `aud` claim unless the
          // server has an app address configured — which Vetra's local
          // switchboard does not. Connect itself mints aud-less tokens for
          // the local reactor for the same reason.
          // See: packages/renown/src/utils.ts (verifyAuthBearerToken docstring)
          const token = await renown.getBearerToken({ expiresIn: 600 });
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        } catch {
          // Token generation failed - proceed without auth
        }
      }

      const res = await fetch(switchboardUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: gql, variables }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }

      const json = (await res.json()) as GraphQLResponse<T>;
      if (json.errors?.length) {
        throw new Error(json.errors.map((e) => e.message).join("; "));
      }
      if (!json.data) {
        throw new Error("No data returned");
      }
      return json.data;
    },
    [switchboardUrl, renown, user?.address],
  );

  return { query, isReady: !!switchboardUrl };
}
