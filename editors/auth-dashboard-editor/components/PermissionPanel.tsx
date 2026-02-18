import { useState } from "react";
import { EnsAddress } from "./EnsAddress.js";

type PermissionLevel = "READ" | "WRITE" | "ADMIN";

interface UserPermission {
  userAddress: string;
  permission: PermissionLevel;
}

interface GroupPermission {
  groupId: number;
  group: { id: number; name: string };
  permission: PermissionLevel;
}

export interface DocumentAccess {
  documentId: string;
  permissions: UserPermission[];
  groupPermissions: GroupPermission[];
}

export interface AvailableGroup {
  id: number;
  name: string;
}

export interface OperationPermissions {
  operationType: string;
  userPermissions: { userAddress: string; grantedBy: string }[];
  groupPermissions: {
    groupId: number;
    group: { id: number; name: string };
    grantedBy: string;
  }[];
}

interface Props {
  access: DocumentAccess;
  availableGroups: AvailableGroup[];
  nodeLabel: string;
  onGrantUser: (address: string, level: PermissionLevel) => void;
  onRevokeUser: (address: string) => void;
  onGrantGroup: (groupId: number, level: PermissionLevel) => void;
  onRevokeGroup: (groupId: number) => void;
  onRefreshGroups: () => void;
  operationPermissions?: OperationPermissions[];
  onGrantOpUser?: (operationType: string, address: string) => void;
  onRevokeOpUser?: (operationType: string, address: string) => void;
  onGrantOpGroup?: (operationType: string, groupId: number) => void;
  onRevokeOpGroup?: (operationType: string, groupId: number) => void;
}

const PERMISSION_COLORS: Record<PermissionLevel, string> = {
  READ: "#3b82f6",
  WRITE: "#f59e0b",
  ADMIN: "#ef4444",
};

function Badge({ level }: { level: PermissionLevel }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#fff",
        backgroundColor: PERMISSION_COLORS[level],
        borderRadius: "4px",
      }}
    >
      {level}
    </span>
  );
}

/* ── Operation Permission Row ─────────────────────────────── */

function OpRow({
  op,
  availableGroups,
  onGrantUser,
  onRevokeUser,
  onGrantGroup,
  onRevokeGroup,
  onRefreshGroups,
}: {
  op: OperationPermissions;
  availableGroups: AvailableGroup[];
  onGrantUser: (address: string) => void;
  onRevokeUser: (address: string) => void;
  onGrantGroup: (groupId: number) => void;
  onRevokeGroup: (groupId: number) => void;
  onRefreshGroups: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [userAddr, setUserAddr] = useState("");
  const [groupId, setGroupId] = useState<number | null>(null);

  const totalRules = op.userPermissions.length + op.groupPermissions.length;

  const handleGrantUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddr.trim()) return;
    onGrantUser(userAddr.trim());
    setUserAddr("");
    setShowAddUser(false);
  };

  const handleGrantGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupId === null) return;
    onGrantGroup(groupId);
    setGroupId(null);
    setShowAddGroup(false);
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          cursor: "pointer",
          backgroundColor: expanded ? "#f9fafb" : "#fff",
          fontSize: "12px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "#9ca3af",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          {"\u25B6"}
        </span>
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 600,
            color: "#374151",
            flex: 1,
          }}
        >
          {op.operationType}
        </span>
        {totalRules > 0 && (
          <span style={{ fontSize: "10px", color: "#9ca3af" }}>
            {totalRules} rule{totalRules !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {expanded && (
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#fafafa",
          }}
        >
          {/* Users */}
          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <span
                style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}
              >
                Users
              </span>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                style={{
                  padding: "2px 8px",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "#4f46e5",
                  backgroundColor: "#fff",
                  border: "1px solid #c7d2fe",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                {showAddUser ? "Cancel" : "+ User"}
              </button>
            </div>

            {showAddUser && (
              <form
                onSubmit={handleGrantUser}
                style={{ display: "flex", gap: "4px", marginBottom: "4px" }}
              >
                <input
                  type="text"
                  value={userAddr}
                  onChange={(e) => setUserAddr(e.target.value)}
                  placeholder="0x..."
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    border: "1px solid #d1d5db",
                    borderRadius: "3px",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "4px 10px",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "#fff",
                    backgroundColor: "#4f46e5",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Grant
                </button>
              </form>
            )}

            {op.userPermissions.length === 0 ? (
              <p style={{ color: "#c4c4c4", fontSize: "11px", margin: 0 }}>
                No users
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {op.userPermissions.map((u) => (
                  <div
                    key={u.userAddress}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      padding: "2px 6px",
                      backgroundColor: "#fff",
                      borderRadius: "3px",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "monospace",
                        color: "#374151",
                      }}
                    >
                      <EnsAddress address={u.userAddress} />
                    </span>
                    <button
                      onClick={() => onRevokeUser(u.userAddress)}
                      style={{
                        padding: "1px 6px",
                        fontSize: "9px",
                        color: "#ef4444",
                        backgroundColor: "transparent",
                        border: "1px solid #fca5a5",
                        borderRadius: "2px",
                        cursor: "pointer",
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groups */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <span
                style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}
              >
                Groups
              </span>
              <button
                onClick={() => {
                  const next = !showAddGroup;
                  setShowAddGroup(next);
                  if (next) onRefreshGroups();
                }}
                style={{
                  padding: "2px 8px",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "#4f46e5",
                  backgroundColor: "#fff",
                  border: "1px solid #c7d2fe",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                {showAddGroup ? "Cancel" : "+ Group"}
              </button>
            </div>

            {showAddGroup && (
              <form
                onSubmit={handleGrantGroup}
                style={{ display: "flex", gap: "4px", marginBottom: "4px" }}
              >
                <select
                  value={groupId ?? ""}
                  onChange={(e) =>
                    setGroupId(
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: "11px",
                    border: "1px solid #d1d5db",
                    borderRadius: "3px",
                  }}
                >
                  <option value="">Select group...</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  style={{
                    padding: "4px 10px",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "#fff",
                    backgroundColor: "#4f46e5",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Grant
                </button>
              </form>
            )}

            {op.groupPermissions.length === 0 ? (
              <p style={{ color: "#c4c4c4", fontSize: "11px", margin: 0 }}>
                No groups
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {op.groupPermissions.map((gp) => (
                  <div
                    key={gp.groupId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      padding: "2px 6px",
                      backgroundColor: "#fff",
                      borderRadius: "3px",
                    }}
                  >
                    <span style={{ flex: 1, color: "#374151" }}>
                      {gp.group.name}
                    </span>
                    <button
                      onClick={() => onRevokeGroup(gp.groupId)}
                      style={{
                        padding: "1px 6px",
                        fontSize: "9px",
                        color: "#ef4444",
                        backgroundColor: "transparent",
                        border: "1px solid #fca5a5",
                        borderRadius: "2px",
                        cursor: "pointer",
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */

export function PermissionPanel({
  access,
  availableGroups,
  nodeLabel,
  onGrantUser,
  onRevokeUser,
  onGrantGroup,
  onRevokeGroup,
  onRefreshGroups,
  operationPermissions,
  onGrantOpUser,
  onRevokeOpUser,
  onGrantOpGroup,
  onRevokeOpGroup,
}: Props) {
  const [showGrantUser, setShowGrantUser] = useState(false);
  const [grantAddress, setGrantAddress] = useState("");
  const [grantLevel, setGrantLevel] = useState<PermissionLevel>("READ");
  const [showGrantGroup, setShowGrantGroup] = useState(false);
  const [grantGroupId, setGrantGroupId] = useState<number | null>(null);
  const [grantGroupLevel, setGrantGroupLevel] =
    useState<PermissionLevel>("READ");

  const handleGrantUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantAddress.trim()) return;
    onGrantUser(grantAddress.trim(), grantLevel);
    setGrantAddress("");
    setShowGrantUser(false);
  };

  const handleGrantGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (grantGroupId === null) return;
    onGrantGroup(grantGroupId, grantGroupLevel);
    setGrantGroupId(null);
    setShowGrantGroup(false);
  };

  const totalPerms = access.permissions.length + access.groupPermissions.length;

  return (
    <div
      style={{
        padding: "16px 20px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>Permissions for</span>
        <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{nodeLabel}</span>
        {totalPerms > 0 && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              color: "#9ca3af",
            }}
          >
            {totalPerms} rule{totalPerms !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* User Permissions */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>
            Users
          </span>
          <button
            onClick={() => setShowGrantUser(!showGrantUser)}
            style={{
              padding: "3px 10px",
              fontSize: "11px",
              fontWeight: 500,
              color: "#4f46e5",
              backgroundColor: "#fff",
              border: "1px solid #c7d2fe",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showGrantUser ? "Cancel" : "+ Add User"}
          </button>
        </div>

        {showGrantUser && (
          <form
            onSubmit={handleGrantUser}
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <input
              type="text"
              value={grantAddress}
              onChange={(e) => setGrantAddress(e.target.value)}
              placeholder="0x... wallet address"
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: "12px",
                fontFamily: "monospace",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
              }}
            />
            <select
              value={grantLevel}
              onChange={(e) => setGrantLevel(e.target.value as PermissionLevel)}
              style={{
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
              }}
            >
              <option value="READ">READ</option>
              <option value="WRITE">WRITE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              type="submit"
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#4f46e5",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Grant
            </button>
          </form>
        )}

        {access.permissions.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            No user permissions set.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {access.permissions.map((p) => (
              <div
                key={p.userAddress}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "4px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: "monospace",
                    color: "#374151",
                  }}
                >
                  <EnsAddress address={p.userAddress} />
                </span>
                <Badge level={p.permission} />
                <button
                  onClick={() => onRevokeUser(p.userAddress)}
                  style={{
                    padding: "2px 8px",
                    fontSize: "10px",
                    color: "#ef4444",
                    backgroundColor: "transparent",
                    border: "1px solid #fca5a5",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Permissions */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>
            Groups
          </span>
          <button
            onClick={() => {
              const next = !showGrantGroup;
              setShowGrantGroup(next);
              if (next) onRefreshGroups();
            }}
            style={{
              padding: "3px 10px",
              fontSize: "11px",
              fontWeight: 500,
              color: "#4f46e5",
              backgroundColor: "#fff",
              border: "1px solid #c7d2fe",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showGrantGroup ? "Cancel" : "+ Add Group"}
          </button>
        </div>

        {showGrantGroup && (
          <form
            onSubmit={handleGrantGroup}
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <select
              value={grantGroupId ?? ""}
              onChange={(e) =>
                setGrantGroupId(
                  e.target.value ? parseInt(e.target.value, 10) : null,
                )
              }
              style={{
                flex: 1,
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
              }}
            >
              <option value="">Select a group...</option>
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} (#{g.id})
                </option>
              ))}
            </select>
            <select
              value={grantGroupLevel}
              onChange={(e) =>
                setGrantGroupLevel(e.target.value as PermissionLevel)
              }
              style={{
                padding: "6px 8px",
                fontSize: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
              }}
            >
              <option value="READ">READ</option>
              <option value="WRITE">WRITE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              type="submit"
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#4f46e5",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Grant
            </button>
          </form>
        )}

        {access.groupPermissions.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            No group permissions set.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {access.groupPermissions.map((gp) => (
              <div
                key={gp.groupId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  padding: "4px 8px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "4px",
                }}
              >
                <span style={{ flex: 1, color: "#374151" }}>
                  {gp.group.name}{" "}
                  <span style={{ color: "#9ca3af", fontSize: "11px" }}>
                    (#{gp.groupId})
                  </span>
                </span>
                <Badge level={gp.permission} />
                <button
                  onClick={() => onRevokeGroup(gp.groupId)}
                  style={{
                    padding: "2px 8px",
                    fontSize: "10px",
                    color: "#ef4444",
                    backgroundColor: "transparent",
                    border: "1px solid #fca5a5",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation Permissions */}
      {operationPermissions && operationPermissions.length > 0 && (
        <div>
          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: "16px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}
            >
              Operation Permissions
            </span>
            <p
              style={{
                fontSize: "11px",
                color: "#9ca3af",
                margin: "4px 0 8px 0",
              }}
            >
              Control which users and groups can execute specific operations on
              this document.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {operationPermissions.map((op) => (
              <OpRow
                key={op.operationType}
                op={op}
                availableGroups={availableGroups}
                onGrantUser={(addr) => onGrantOpUser?.(op.operationType, addr)}
                onRevokeUser={(addr) =>
                  onRevokeOpUser?.(op.operationType, addr)
                }
                onGrantGroup={(gid) => onGrantOpGroup?.(op.operationType, gid)}
                onRevokeGroup={(gid) =>
                  onRevokeOpGroup?.(op.operationType, gid)
                }
                onRefreshGroups={onRefreshGroups}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
