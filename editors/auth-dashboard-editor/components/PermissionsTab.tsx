import { useCallback, useEffect, useRef, useState } from "react";
import {
  PermissionPanel,
  type AvailableGroup,
  type DocumentAccess,
  type OperationPermissions,
} from "./PermissionPanel.js";

type PermissionLevel = "READ" | "WRITE" | "ADMIN";

/* ── Data shapes ────────────────────────────────────────────── */

interface DriveNode {
  id: string;
  name: string;
  kind: "drive";
  children: TreeNode[];
}

interface FolderNode {
  id: string;
  name: string;
  kind: "folder";
  parentFolder: string | null;
  children: TreeNode[];
}

interface FileNode {
  id: string;
  name: string;
  kind: "file";
  documentType: string;
  parentFolder: string | null;
}

type TreeNode = DriveNode | FolderNode | FileNode;

interface Props {
  query: <T>(gql: string, variables?: Record<string, unknown>) => Promise<T>;
}

/* ── Constants ──────────────────────────────────────────────── */

// No type filtering — admins should see all documents to manage permissions

const POLL_INTERVAL = 10_000;

/* ── Queries / Mutations ────────────────────────────────────── */

const DRIVES_LIST_QUERY = `{
  driveDocuments {
    id
    name
  }
}`;

const DRIVE_DETAIL_QUERY = `query DriveDocument($idOrSlug: String!) {
  driveDocument(idOrSlug: $idOrSlug) {
    id
    name
    documentType
    state {
      name
      nodes {
        ... on DocumentDrive_FolderNode {
          id name kind parentFolder
        }
        ... on DocumentDrive_FileNode {
          id name kind documentType parentFolder
        }
      }
    }
  }
}`;

const GROUPS_QUERY = `{ groups { id name } }`;

const DOC_ACCESS_QUERY = `query DocAccess($documentId: String!) {
  documentAccess(documentId: $documentId) {
    documentId
    permissions { documentId userAddress permission grantedBy }
    groupPermissions { documentId groupId group { id name } permission grantedBy }
  }
}`;

const GRANT_PERMISSION = `mutation Grant($documentId: String!, $userAddress: String!, $permission: DocumentPermissionLevel!) {
  grantDocumentPermission(documentId: $documentId, userAddress: $userAddress, permission: $permission) {
    documentId userAddress permission
  }
}`;

const REVOKE_PERMISSION = `mutation Revoke($documentId: String!, $userAddress: String!) {
  revokeDocumentPermission(documentId: $documentId, userAddress: $userAddress)
}`;

const GRANT_GROUP_PERMISSION = `mutation GrantGroup($documentId: String!, $groupId: Int!, $permission: DocumentPermissionLevel!) {
  grantGroupPermission(documentId: $documentId, groupId: $groupId, permission: $permission) {
    documentId groupId permission
  }
}`;

const REVOKE_GROUP_PERMISSION = `mutation RevokeGroup($documentId: String!, $groupId: Int!) {
  revokeGroupPermission(documentId: $documentId, groupId: $groupId)
}`;

const DRIVE_OPS_QUERY = `query DriveOps($idOrSlug: String!) {
  driveDocument(idOrSlug: $idOrSlug) {
    operations(skip: 0, first: 200) { type }
  }
}`;

const OP_PERMS_QUERY = `query OpPerms($documentId: String!, $operationType: String!) {
  operationPermissions(documentId: $documentId, operationType: $operationType) {
    operationType
    userPermissions { userAddress grantedBy }
    groupPermissions { groupId group { id name } grantedBy }
  }
}`;

const GRANT_OP_PERM = `mutation GrantOp($documentId: String!, $operationType: String!, $userAddress: String!) {
  grantOperationPermission(documentId: $documentId, operationType: $operationType, userAddress: $userAddress) {
    documentId operationType userAddress
  }
}`;

const REVOKE_OP_PERM = `mutation RevokeOp($documentId: String!, $operationType: String!, $userAddress: String!) {
  revokeOperationPermission(documentId: $documentId, operationType: $operationType, userAddress: $userAddress)
}`;

const GRANT_GROUP_OP_PERM = `mutation GrantGroupOp($documentId: String!, $operationType: String!, $groupId: Int!) {
  grantGroupOperationPermission(documentId: $documentId, operationType: $operationType, groupId: $groupId) {
    documentId operationType groupId
  }
}`;

const REVOKE_GROUP_OP_PERM = `mutation RevokeGroupOp($documentId: String!, $operationType: String!, $groupId: Int!) {
  revokeGroupOperationPermission(documentId: $documentId, operationType: $operationType, groupId: $groupId)
}`;

const DOC_OPS_QUERY = `query DocOps($documentId: String!) {
  documentOperations(documentId: $documentId) {
    documentId
    documentType
    operations { name module scope }
  }
}`;

/* ── Icons ──────────────────────────────────────────────────── */

const ICONS: Record<string, string> = {
  drive: "\uD83D\uDDB4", // 🖴 hard drive
  folder: "\uD83D\uDCC1", // 📁
  file: "\uD83D\uDCC4", // 📄
};

/* ── Helpers ────────────────────────────────────────────────── */

interface RawNode {
  id?: string;
  name?: string;
  kind?: string;
  documentType?: string;
  parentFolder?: string | null;
}

interface RawDriveListItem {
  id: string;
  name: string;
}

interface RawDriveDetail {
  id: string;
  name: string;
  state: { name: string; nodes: RawNode[] };
}

function buildTree(drives: RawDriveDetail[]): DriveNode[] {
  return drives.map((drive) => {
    const folders = new Map<string, FolderNode>();
    const rootChildren: TreeNode[] = [];

    // First pass: create all folder nodes
    for (const n of drive.state.nodes) {
      if (!n.id || n.kind !== "folder") continue;
      folders.set(n.id, {
        id: n.id,
        name: n.name || "Untitled Folder",
        kind: "folder",
        parentFolder: n.parentFolder ?? null,
        children: [],
      });
    }

    // Second pass: create file nodes and attach to parents
    for (const n of drive.state.nodes) {
      if (!n.id) continue;

      if (n.kind === "folder") {
        const folder = folders.get(n.id)!;
        const parent = n.parentFolder ? folders.get(n.parentFolder) : null;
        if (parent) {
          parent.children.push(folder);
        } else {
          rootChildren.push(folder);
        }
      } else if (n.documentType) {
        const file: FileNode = {
          id: n.id,
          name: n.name || "Untitled",
          kind: "file",
          documentType: n.documentType,
          parentFolder: n.parentFolder ?? null,
        };
        const parent = n.parentFolder ? folders.get(n.parentFolder) : null;
        if (parent) {
          parent.children.push(file);
        } else {
          rootChildren.push(file);
        }
      }
    }

    return {
      id: drive.id,
      name: drive.name || "Untitled Drive",
      kind: "drive" as const,
      children: rootChildren,
    };
  });
}

function TypeLabel({ type }: { type: string }) {
  const short = type.includes("/") ? type.split("/").pop() : type;
  return (
    <span
      style={{
        padding: "1px 6px",
        fontSize: "10px",
        color: "#6b7280",
        backgroundColor: "#f3f4f6",
        borderRadius: "3px",
        fontFamily: "monospace",
      }}
    >
      {short}
    </span>
  );
}

/* ── Tree Row ───────────────────────────────────────────────── */

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const hasChildren = "children" in node && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const icon = ICONS[node.kind] || ICONS.file;
  const isContainer = node.kind === "drive" || node.kind === "folder";

  return (
    <>
      <div
        onClick={() => {
          // Selecting a collapsed container auto-expands it
          if (isContainer && !isExpanded && hasChildren) {
            onToggleExpand(node.id);
          }
          onSelect(node.id);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (isContainer && !isExpanded && hasChildren)
              onToggleExpand(node.id);
            onSelect(node.id);
          }
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: `8px 12px 8px ${12 + depth * 24}px`,
          border: "none",
          borderLeft: isSelected
            ? "3px solid #4f46e5"
            : "3px solid transparent",
          backgroundColor: isSelected ? "#eef2ff" : "transparent",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "13px",
          transition: "background-color 0.1s",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          if (!isSelected)
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              "#f9fafb";
        }}
        onMouseLeave={(e) => {
          if (!isSelected)
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              "transparent";
        }}
      >
        {/* Expand/collapse arrow — separate click target */}
        {isContainer ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) onToggleExpand(node.id);
            }}
            style={{
              width: "20px",
              height: "20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "#9ca3af",
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              flexShrink: 0,
              borderRadius: "3px",
              cursor: hasChildren ? "pointer" : "default",
            }}
          >
            {hasChildren ? "\u25B6" : ""}
          </span>
        ) : (
          <span style={{ width: "20px", flexShrink: 0 }} />
        )}

        <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>

        <span
          style={{
            flex: 1,
            fontWeight: node.kind === "drive" ? 600 : 400,
            color: "#1a1a2e",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.name}
        </span>

        {node.kind === "file" && <TypeLabel type={node.documentType} />}

        {node.kind === "drive" && (
          <span
            style={{
              padding: "1px 6px",
              fontSize: "10px",
              color: "#7c3aed",
              backgroundColor: "#f5f3ff",
              borderRadius: "3px",
              fontWeight: 500,
            }}
          >
            Drive
          </span>
        )}

        <span
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#c4c4c4",
            flexShrink: 0,
          }}
        >
          {node.id.slice(0, 8)}
        </span>
      </div>

      {/* Render children if expanded */}
      {isContainer && isExpanded && hasChildren && (
        <>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </>
      )}
    </>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function PermissionsTab({ query }: Props) {
  const [tree, setTree] = useState<DriveNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [access, setAccess] = useState<DocumentAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [opPerms, setOpPerms] = useState<OperationPermissions[]>([]);

  // Track the selected node's label for the panel header
  const selectedLabel = useRef("");

  /* ── Data loading ───────────────────────────────────── */

  const loadTree = useCallback(async () => {
    try {
      // Step 1: Get list of drive IDs
      const listData = await query<{ driveDocuments: RawDriveListItem[] }>(
        DRIVES_LIST_QUERY,
      );

      // Step 2: Fetch full state (with nodes) for each drive
      const driveDetails = await Promise.all(
        listData.driveDocuments.map(async (d) => {
          try {
            const detail = await query<{ driveDocument: RawDriveDetail }>(
              DRIVE_DETAIL_QUERY,
              { idOrSlug: d.id },
            );
            return detail.driveDocument;
          } catch {
            // If a drive fails, return it with empty nodes
            return {
              id: d.id,
              name: d.name,
              state: { name: d.name, nodes: [] },
            };
          }
        }),
      );

      const drives = buildTree(driveDetails);
      setTree(drives);

      // Auto-expand drives on first load
      setExpandedIds((prev) => {
        if (prev.size > 0) return prev;
        return new Set(drives.map((d) => d.id));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadGroups = useCallback(async () => {
    try {
      const data = await query<{ groups: AvailableGroup[] }>(GROUPS_QUERY);
      setAvailableGroups(data.groups);
    } catch {
      // Silently fail
    }
  }, [query]);

  const loadAccess = useCallback(
    async (docId: string) => {
      setAccessLoading(true);
      setAccess(null);
      setError("");
      try {
        const data = await query<{ documentAccess: DocumentAccess }>(
          DOC_ACCESS_QUERY,
          { documentId: docId },
        );
        setAccess(data.documentAccess);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load permissions");
      } finally {
        setAccessLoading(false);
      }
    },
    [query],
  );

  // Find the drive ID that contains a given node
  const findDriveId = useCallback(
    (nodeId: string): string | null => {
      for (const drive of tree) {
        if (drive.id === nodeId) return drive.id;
        const found = (function search(nodes: TreeNode[]): boolean {
          for (const n of nodes) {
            if (n.id === nodeId) return true;
            if ("children" in n && search(n.children)) return true;
          }
          return false;
        })(drive.children);
        if (found) return drive.id;
      }
      return null;
    },
    [tree],
  );

  // Check if a node is a drive (top-level)
  const isDriveNode = useCallback(
    (nodeId: string): boolean => tree.some((d) => d.id === nodeId),
    [tree],
  );

  const loadOpPerms = useCallback(
    async (docId: string) => {
      setOpPerms([]);
      try {
        let uniqueTypes: string[] = [];

        if (isDriveNode(docId)) {
          // For drives: get operation types from drive operation history
          const driveId = findDriveId(docId);
          if (!driveId) return;

          const opsData = await query<{
            driveDocument: { operations: { type: string }[] };
          }>(DRIVE_OPS_QUERY, { idOrSlug: driveId });

          uniqueTypes = [
            ...new Set(opsData.driveDocument.operations.map((o) => o.type)),
          ].sort();
        } else {
          // For child documents: get operation types from document model definition
          const opsData = await query<{
            documentOperations: {
              documentType: string;
              operations: { name: string; module: string; scope: string }[];
            };
          }>(DOC_OPS_QUERY, { documentId: docId });

          uniqueTypes = opsData.documentOperations.operations
            .map((o) => o.name)
            .sort();
        }

        if (uniqueTypes.length === 0) return;

        // Fetch existing permissions for each operation type
        const perms = await Promise.all(
          uniqueTypes.map(async (opType) => {
            try {
              const data = await query<{
                operationPermissions: OperationPermissions;
              }>(OP_PERMS_QUERY, {
                documentId: docId,
                operationType: opType,
              });
              return data.operationPermissions;
            } catch {
              return {
                operationType: opType,
                userPermissions: [],
                groupPermissions: [],
              };
            }
          }),
        );

        setOpPerms(perms);
      } catch {
        // Silently fail — operation permissions are optional
      }
    },
    [query, findDriveId, isDriveNode],
  );

  /* ── Initial load + polling ─────────────────────────── */

  useEffect(() => {
    void loadTree();
    void loadGroups();
  }, [loadTree, loadGroups]);

  useEffect(() => {
    const interval = setInterval(() => void loadTree(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadTree]);

  /* ── Selection handlers ─────────────────────────────── */

  function findNodeLabel(id: string): string {
    for (const drive of tree) {
      if (drive.id === id) return drive.name;
      const found = findInChildren(drive.children, id);
      if (found) return found;
    }
    return id.slice(0, 8) + "...";
  }

  function findInChildren(nodes: TreeNode[], id: string): string | null {
    for (const n of nodes) {
      if (n.id === id) return n.name;
      if ("children" in n) {
        const found = findInChildren(n.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const handleSelect = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setAccess(null);
      setOpPerms([]);
    } else {
      setSelectedId(id);
      selectedLabel.current = findNodeLabel(id);
      void loadAccess(id);
      void loadOpPerms(id);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Mutation handlers ──────────────────────────────── */

  const handleGrantUser = async (address: string, level: PermissionLevel) => {
    if (!selectedId) return;
    try {
      await query(GRANT_PERMISSION, {
        documentId: selectedId,
        userAddress: address,
        permission: level,
      });
      void loadAccess(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grant permission");
    }
  };

  const handleRevokeUser = async (userAddress: string) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_PERMISSION, { documentId: selectedId, userAddress });
      void loadAccess(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke permission");
    }
  };

  const handleGrantGroup = async (groupId: number, level: PermissionLevel) => {
    if (!selectedId) return;
    try {
      await query(GRANT_GROUP_PERMISSION, {
        documentId: selectedId,
        groupId,
        permission: level,
      });
      void loadAccess(selectedId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to grant group permission",
      );
    }
  };

  const handleRevokeGroup = async (groupId: number) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_GROUP_PERMISSION, {
        documentId: selectedId,
        groupId,
      });
      void loadAccess(selectedId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to revoke group permission",
      );
    }
  };

  /* ── Operation permission handlers ─────────────────── */

  const handleGrantOpUser = async (opType: string, address: string) => {
    if (!selectedId) return;
    try {
      await query(GRANT_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        userAddress: address,
      });
      void loadOpPerms(selectedId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to grant operation permission",
      );
    }
  };

  const handleRevokeOpUser = async (opType: string, address: string) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        userAddress: address,
      });
      void loadOpPerms(selectedId);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to revoke operation permission",
      );
    }
  };

  const handleGrantOpGroup = async (opType: string, groupId: number) => {
    if (!selectedId) return;
    try {
      await query(GRANT_GROUP_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        groupId,
      });
      void loadOpPerms(selectedId);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to grant group operation permission",
      );
    }
  };

  const handleRevokeOpGroup = async (opType: string, groupId: number) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_GROUP_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        groupId,
      });
      void loadOpPerms(selectedId);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to revoke group operation permission",
      );
    }
  };

  /* ── Render ─────────────────────────────────────────── */

  if (loading) {
    return (
      <p style={{ color: "#6b7280", padding: "24px" }}>Loading documents...</p>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0" }}
          >
            Document Permissions
          </h3>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
            Select a drive, folder, or document to manage its permissions.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: "#9ca3af",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              display: "inline-block",
            }}
          />
          Auto-sync
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          padding: "10px 16px",
          backgroundColor: "#f8fafc",
          borderRadius: "6px",
          marginBottom: "16px",
          fontSize: "11px",
          color: "#6b7280",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, color: "#374151" }}>
          Permission Levels:
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              backgroundColor: "#3b82f6",
              marginRight: "4px",
            }}
          />
          READ — View only
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              backgroundColor: "#f59e0b",
              marginRight: "4px",
            }}
          />
          WRITE — Can edit
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              backgroundColor: "#ef4444",
              marginRight: "4px",
            }}
          />
          ADMIN — Full control
        </span>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {tree.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "14px", padding: "16px 0" }}>
          No drives found.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          {/* Left: Tree */}
          <div
            style={{
              flex: "1 1 0%",
              minWidth: 0,
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {tree.map((drive) => (
              <TreeRow
                key={drive.id}
                node={drive}
                depth={0}
                selectedId={selectedId}
                onSelect={handleSelect}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>

          {/* Right: Permission Panel */}
          <div style={{ flex: "1 1 0%", minWidth: 0 }}>
            {selectedId === null ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: "13px",
                  border: "1px dashed #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                Select a drive, folder, or document from the tree to view and
                manage its permissions.
              </div>
            ) : accessLoading ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "13px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                Loading permissions...
              </div>
            ) : access ? (
              <PermissionPanel
                access={access}
                availableGroups={availableGroups}
                nodeLabel={selectedLabel.current}
                onGrantUser={(addr, level) => void handleGrantUser(addr, level)}
                onRevokeUser={(addr) => void handleRevokeUser(addr)}
                onGrantGroup={(gid, level) => void handleGrantGroup(gid, level)}
                onRevokeGroup={(gid) => void handleRevokeGroup(gid)}
                onRefreshGroups={() => void loadGroups()}
                operationPermissions={opPerms}
                onGrantOpUser={(op, addr) => void handleGrantOpUser(op, addr)}
                onRevokeOpUser={(op, addr) => void handleRevokeOpUser(op, addr)}
                onGrantOpGroup={(op, gid) => void handleGrantOpGroup(op, gid)}
                onRevokeOpGroup={(op, gid) => void handleRevokeOpGroup(op, gid)}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
