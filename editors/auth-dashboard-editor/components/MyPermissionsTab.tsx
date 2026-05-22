import { useCallback, useEffect, useState } from "react";
import { useEnsName, formatAddress } from "../hooks/useEnsName.js";
import { EnsAddress } from "./EnsAddress.js";

// Click-to-copy ID chip. Hover shows a tooltip with the full id + "Click to
// copy" hint; clicking writes the id to the clipboard and briefly swaps in a
// "Copied!" affordance.
function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(() => {
    void navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {
        // Clipboard may be blocked in some embedded contexts; fail silently.
      });
  }, [id]);

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={onClick}
        title={`${id}\n\nClick to copy`}
        style={{
          padding: "2px 6px",
          fontFamily: "monospace",
          fontSize: "11px",
          color: copied ? "#15803d" : "#4b5563",
          backgroundColor: copied ? "#dcfce7" : "#f3f4f6",
          border: `1px solid ${copied ? "#86efac" : "#e5e7eb"}`,
          borderRadius: "4px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          transition: "background-color 0.15s, color 0.15s, border-color 0.15s",
        }}
      >
        <span>{copied ? "Copied!" : `${id.slice(0, 8)}…`}</span>
        {!copied && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </span>
  );
}

type PermissionLevel = "READ" | "WRITE" | "ADMIN";

interface UserDocPermission {
  documentId: string;
  permission: PermissionLevel;
  grantedBy: string;
  createdAt: string;
}

interface UserGroup {
  id: number;
  name: string;
  description: string | null;
  members: string[];
}

interface DocumentMeta {
  name: string;
  documentType: string;
}

interface Props {
  query: <T>(gql: string, variables?: Record<string, unknown>) => Promise<T>;
  userAddress: string;
}

const MY_PERMISSIONS_QUERY = `{
  userDocumentPermissions {
    documentId permission grantedBy createdAt
  }
}`;

const USER_GROUPS_QUERY = `query UserGroups($userAddress: String!) {
  userGroups(userAddress: $userAddress) {
    id name description members
  }
}`;

const DOCUMENT_META_QUERY = `query DocumentMeta($id: String!) {
  document(identifier: $id) {
    document { id name documentType }
  }
}`;

const PERMISSION_COLORS: Record<PermissionLevel, string> = {
  READ: "#3b82f6",
  WRITE: "#f59e0b",
  ADMIN: "#ef4444",
};

export function MyPermissionsTab({ query, userAddress }: Props) {
  const [permissions, setPermissions] = useState<UserDocPermission[]>([]);
  // Allow undefined on lookup — many ids may not (yet) be in the map: still
  // loading, or the document was deleted and the per-id fetch failed.
  const [docMeta, setDocMeta] = useState<
    Record<string, DocumentMeta | undefined>
  >({});
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lookupAddress, setLookupAddress] = useState(userAddress);

  const ensName = useEnsName(userAddress);

  const loadDocumentMeta = useCallback(
    async (ids: string[]) => {
      // Server's findDocuments rejects `identifiers` alone as search criteria
      // ("No search criteria provided"), so we fall back to N+1: one
      // document(identifier:) call per id, run in parallel. Missing/deleted
      // docs raise a top-level GraphQL error which the shared query() helper
      // surfaces as a rejection — we catch per-id and skip those rows so the
      // permission record still renders with "—" for Name/Type.
      const unique = Array.from(new Set(ids)).filter(Boolean);
      const results = await Promise.all(
        unique.map(async (id) => {
          try {
            const data = await query<{
              document: {
                document: { id: string; name: string; documentType: string };
              } | null;
            }>(DOCUMENT_META_QUERY, { id });
            const doc = data.document?.document;
            if (!doc) return null;
            return [
              id,
              { name: doc.name, documentType: doc.documentType },
            ] as const;
          } catch {
            return null;
          }
        }),
      );
      const map: Record<string, DocumentMeta | undefined> = {};
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      setDocMeta(map);
    },
    [query],
  );

  const loadMyPermissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await query<{
        userDocumentPermissions: UserDocPermission[];
      }>(MY_PERMISSIONS_QUERY);
      setPermissions(data.userDocumentPermissions);
      if (data.userDocumentPermissions.length > 0) {
        // Fire and forget — populates docMeta as it resolves; rows render
        // with "—" placeholders until then.
        void loadDocumentMeta(
          data.userDocumentPermissions.map((p) => p.documentId),
        );
      } else {
        setDocMeta({});
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load permissions";
      // Handle server-side errors gracefully (e.g. toLowerCase on null)
      if (msg.includes("toLowerCase")) {
        setPermissions([]);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [query, loadDocumentMeta]);

  const loadUserGroups = useCallback(
    async (addr: string) => {
      try {
        const data = await query<{ userGroups: UserGroup[] }>(
          USER_GROUPS_QUERY,
          { userAddress: addr },
        );
        setGroups(data.userGroups);
      } catch {
        // Silently fail — groups will just be empty
      }
    },
    [query],
  );

  useEffect(() => {
    void loadMyPermissions();
    void loadUserGroups(userAddress);
  }, [loadMyPermissions, loadUserGroups, userAddress]);

  const lookupGroups = async () => {
    if (!lookupAddress.trim()) return;
    setError("");
    try {
      const data = await query<{ userGroups: UserGroup[] }>(USER_GROUPS_QUERY, {
        userAddress: lookupAddress.trim(),
      });
      setGroups(data.userGroups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user groups");
    }
  };

  if (loading) {
    return (
      <p style={{ color: "#6b7280", padding: "24px" }}>
        Loading permissions...
      </p>
    );
  }

  return (
    <div>
      {/* Identity card */}
      <div
        style={{
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #c7d2fe",
          backgroundColor: "#eef2ff",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#1a1a2e",
            marginBottom: "4px",
          }}
        >
          Signed in
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#6b7280",
            margin: "0 0 6px 0",
            fontFamily: "monospace",
          }}
        >
          {formatAddress(userAddress, ensName)}
        </p>
        <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>
          In v6 your access is the union of any document permissions and group
          memberships below. There is no global role.
        </p>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {/* Document Permissions */}
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
        My Document Permissions
      </h3>

      {permissions.length === 0 ? (
        <p
          style={{
            color: "#9ca3af",
            fontSize: "14px",
            textAlign: "center",
            padding: "24px",
            border: "1px solid #f3f4f6",
            borderRadius: "8px",
            marginBottom: "24px",
          }}
        >
          No explicit document permissions found. You can still access any
          unprotected document.
        </p>
      ) : (
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginBottom: "24px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  backgroundColor: "#f9fafb",
                }}
              >
                <th
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                    zIndex: 1,
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                    zIndex: 1,
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                    zIndex: 1,
                  }}
                >
                  Permission
                </th>
                <th
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                    zIndex: 1,
                  }}
                >
                  Granted By
                </th>
                <th
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                    zIndex: 1,
                  }}
                >
                  Created
                </th>
                <th
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                    zIndex: 1,
                  }}
                >
                  ID
                </th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => {
                const meta = docMeta[p.documentId];
                return (
                  <tr
                    key={p.documentId}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        fontSize: "13px",
                        color: meta?.name ? "#1a1a2e" : "#9ca3af",
                      }}
                    >
                      {meta?.name || "—"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {meta?.documentType ? (
                        <span
                          style={{
                            padding: "2px 8px",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "#374151",
                            backgroundColor: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {meta.documentType}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#fff",
                          backgroundColor: PERMISSION_COLORS[p.permission],
                          borderRadius: "4px",
                        }}
                      >
                        {p.permission}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      {p.grantedBy ? <EnsAddress address={p.grantedBy} /> : "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontSize: "12px",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        fontSize: "11px",
                        color: "#9ca3af",
                      }}
                    >
                      <CopyId id={p.documentId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* My Groups */}
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
        My Groups
      </h3>
      {groups.length === 0 ? (
        <p
          style={{
            color: "#9ca3af",
            fontSize: "14px",
            textAlign: "center",
            padding: "24px",
            border: "1px solid #f3f4f6",
            borderRadius: "8px",
            marginBottom: "24px",
          }}
        >
          Not a member of any groups.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                padding: "12px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                backgroundColor: "#fafafa",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "14px" }}>
                {g.name}
              </span>
              {g.description && (
                <span
                  style={{
                    color: "#6b7280",
                    fontSize: "13px",
                    marginLeft: "8px",
                  }}
                >
                  — {g.description}
                </span>
              )}
              <span
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  marginLeft: "12px",
                }}
              >
                {g.members.length} member{g.members.length !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* User Group Lookup — available to anyone, but server will reject if you can't list groups */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          paddingTop: "24px",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
          User Group Lookup
        </h3>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="text"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="0x... address"
            onKeyDown={(e) => {
              if (e.key === "Enter") void lookupGroups();
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: "13px",
              fontFamily: "monospace",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          />
          <button
            onClick={() => void lookupGroups()}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#fff",
              backgroundColor: "#4f46e5",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Lookup
          </button>
        </div>
      </div>
    </div>
  );
}
