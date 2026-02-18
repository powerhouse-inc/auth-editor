import { useCallback, useEffect, useState } from "react";
import { useEnsName, formatAddress } from "../hooks/useEnsName.js";
import { EnsAddress } from "./EnsAddress.js";

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

interface Props {
  query: <T>(gql: string, variables?: Record<string, unknown>) => Promise<T>;
  userAddress: string;
  isAdmin: boolean;
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

const WHOAMI_QUERY = `query WhoAmI($address: String!) {
  whoami(address: $address) {
    address
    isAdmin
    isUser
    isGuest
  }
}`;

const PERMISSION_COLORS: Record<PermissionLevel, string> = {
  READ: "#3b82f6",
  WRITE: "#f59e0b",
  ADMIN: "#ef4444",
};

const ROLE_INFO = {
  admin: {
    label: "ADMIN",
    color: "#ef4444",
    bg: "#fef2f2",
    description:
      "Full access — can manage drives, permissions, groups, and all documents.",
  },
  user: {
    label: "USER",
    color: "#f59e0b",
    bg: "#fffbeb",
    description: "Standard access — can create and edit documents.",
  },
  guest: {
    label: "GUEST",
    color: "#3b82f6",
    bg: "#eff6ff",
    description:
      "Read-only access — can view documents with explicit permissions.",
  },
} as const;

export function MyPermissionsTab({ query, userAddress, isAdmin }: Props) {
  const [permissions, setPermissions] = useState<UserDocPermission[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lookupAddress, setLookupAddress] = useState(userAddress);

  const [globalRole, setGlobalRole] = useState<"admin" | "user" | "guest">(
    isAdmin ? "admin" : "user",
  );
  const ensName = useEnsName(userAddress);
  const roleInfo = ROLE_INFO[globalRole];

  const loadMyPermissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await query<{
        userDocumentPermissions: UserDocPermission[];
      }>(MY_PERMISSIONS_QUERY);
      setPermissions(data.userDocumentPermissions);
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
  }, [query]);

  // Auto-load user's groups on mount
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

  const loadWhoAmI = useCallback(
    async (addr: string) => {
      try {
        const data = await query<{
          whoami: {
            isAdmin: boolean;
            isUser: boolean;
            isGuest: boolean;
          };
        }>(WHOAMI_QUERY, { address: addr });
        const { isAdmin: admin, isUser: user } = data.whoami;
        setGlobalRole(admin ? "admin" : user ? "user" : "guest");
      } catch {
        // Fall back to prop-based inference
      }
    },
    [query],
  );

  useEffect(() => {
    void loadMyPermissions();
    void loadUserGroups(userAddress);
    void loadWhoAmI(userAddress);
  }, [loadMyPermissions, loadUserGroups, loadWhoAmI, userAddress]);

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
      {/* Layer 0: Global Role */}
      <div
        style={{
          padding: "16px",
          borderRadius: "8px",
          border: `1px solid ${roleInfo.color}33`,
          backgroundColor: roleInfo.bg,
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>
            Global Role
          </span>
          <span
            style={{
              padding: "2px 10px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: roleInfo.color,
              borderRadius: "4px",
            }}
          >
            {roleInfo.label}
          </span>
        </div>
        <p
          style={{
            fontSize: "13px",
            color: "#4b5563",
            margin: "0 0 8px 0",
          }}
        >
          {roleInfo.description}
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#6b7280",
            margin: 0,
            fontFamily: "monospace",
          }}
        >
          {formatAddress(userAddress, ensName)}
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
          No explicit document permissions found.
          {isAdmin &&
            " As an admin, you have implicit access to all documents."}
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
            marginBottom: "24px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #e5e7eb",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>
                Document ID
              </th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>
                Permission
              </th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>
                Granted By
              </th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr
                key={p.documentId}
                style={{ borderBottom: "1px solid #f3f4f6" }}
              >
                <td
                  style={{
                    padding: "8px 12px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                >
                  {p.documentId}
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
                  }}
                >
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* User Group Lookup */}
      {isAdmin && (
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "24px",
          }}
        >
          <h3
            style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}
          >
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
      )}
    </div>
  );
}
