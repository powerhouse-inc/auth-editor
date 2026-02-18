import { useCallback } from "react";
import {
  useConnectCrypto,
  useUser,
} from "@powerhousedao/reactor-browser/connect";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * Hook for making authenticated GraphQL requests to the switchboard.
 *
 * Auth tokens are obtained automatically from Connect's Renown login
 * via useConnectCrypto().getBearerToken(). In production, Connect and
 * the reactor share the same origin so CORS is not an issue.
 */
export function useAuthApi(switchboardUrl: string | null | undefined) {
  const crypto = useConnectCrypto();
  const user = useUser();

  const query = useCallback(
    async <T>(gql: string, variables?: Record<string, unknown>): Promise<T> => {
      if (!switchboardUrl) throw new Error("No switchboard URL configured");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Get a fresh bearer token from Connect's crypto (Renown login).
      // Token is generated per-request with a short expiry, matching
      // how Connect's GqlRequestChannel authenticates.
      if (crypto && user?.address) {
        try {
          const token = await crypto.getBearerToken(
            switchboardUrl,
            user.address,
            false,
            { expiresIn: 600 },
          );
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
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
    [switchboardUrl, crypto, user?.address],
  );

  return { query, isReady: !!switchboardUrl };
}
